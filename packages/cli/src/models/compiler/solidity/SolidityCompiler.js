import solc from 'solc'
import axios from 'axios'
import { Logger, FileSystem } from 'zos-lib'
import SolidityDependenciesFinder from './SolidityDependenciesFinder'

const log = new Logger('SolidityCompiler')
const VERSIONS_URL = 'https://solc-bin.ethereum.org/bin/list.json'

export default class SolidityCompiler {
  static latestVersion() {
    return solc.version()
  }

  constructor(contracts, { version, optimizer }) {
    this.errors = []
    this.contracts = contracts
    this.optimizer = optimizer
    this.version = version
  }

  async call() {
    const solcOutput = await this._compile()
    return this._buildContractsData(solcOutput)
  }

  async solc() {
    if (this.version === SolidityCompiler.latestVersion()) return solc
    const version = await this._findVersion()
    const parsedVersion = version.replace('soljson-', '').replace('.js', '')
    return new Promise((resolve, reject) => {
      solc.loadRemoteVersion(parsedVersion, (error, compiler) => {
        return error ? reject(error) : resolve(compiler)
      })
    })
  }

  async versions() {
    const response = await axios.request({ url: VERSIONS_URL })
    if (response.status === 200) return response.data
    else throw Error(`Could not fetch solc versions from ${VERSIONS_URL} (status ${response.status})`)
  }

  async _compile() {
    const input = this._getCompilerInput()
    const requestedSolc = await this.solc()
    const output = requestedSolc.compile(JSON.stringify(input), dep => this._findDependency(dep, this))
    const parsedOutput = JSON.parse(output)
    const outputErrors = parsedOutput.errors || []
    if (outputErrors.length === 0) return parsedOutput

    const errors = outputErrors.filter(finding => finding.severity !== 'warning')
    const warnings = outputErrors.filter(finding => finding.severity === 'warning')
    const errorMessages = errors.map(error => error.formattedMessage).join('\n')
    const warningMessages = warnings.map(warning => warning.formattedMessage).join('\n')

    if (warnings.length > 0) log.warn(`Compilation warnings: \n${warningMessages}`)
    if (errors.length > 0) throw Error(`Compilation errors: \n${errorMessages}`)
  }

  _buildSources() {
    return this.contracts.reduce((sources, contract) => {
      log.info(`Compiling ${contract.fileName} ...`)
      sources[contract.fileName] = { content: contract.source }
      return sources
    }, {})
  }

  _findDependency(dependencyPath, compiler) {
    const dependencyName = dependencyPath.substring(dependencyPath.lastIndexOf('/') + 1)
    let dependencyContract = compiler.contracts.find(contract => contract.fileName === dependencyName)
    if (!dependencyContract) dependencyContract = SolidityDependenciesFinder.call(dependencyPath)
    if (!dependencyContract) return { error: 'File not found' }
    log.info(`Compiling ${dependencyName} ...`)
    return { contents: dependencyContract.source }
  }

  async _findVersion() {
    const versions = await this.versions()
    if (versions.releases[this.version]) return versions.releases[this.version]
    const isPrerelease = this.version.includes('nightly') || this.version.includes('commit')
    if (isPrerelease) {
      const isVersion = build => build['prerelease'] === version || build['build'] === version || build['longVersion'] === version
      const build = versions.builds.find(isVersion)
      if (build) return build['path']
    }
    throw Error(`Could not find version ${this.version} in ${VERSIONS_URL}`)
  }

  _buildContractsData(solcOutput) {
    return Object.keys(solcOutput.contracts).flatMap(fileName =>
      Object.keys(solcOutput.contracts[fileName]).map(contractName =>
        this._buildContractData(solcOutput, fileName, contractName)
      )
    )
  }

  _buildContractData(solcOutput, fileName, contractName) {
    const output = solcOutput.contracts[fileName][contractName]
    const source = solcOutput.sources[fileName]
    const contract = this.contracts.find(contract => contract.fileName === fileName)

    return {
      fileName,
      contractName,
      source: contract.source,
      sourcePath: contract.filePath,
      sourceMap: output.evm.bytecode.sourceMap,
      abi: output.abi,
      ast: source.ast,
      legacyAST: source.legacyAST,
      bytecode: `0x${output.evm.bytecode.object}`,
      deployedBytecode: `0x${output.evm.deployedBytecode.object}`,
      compiler: {
        'name': 'solc',
        'version': this.version,
        'optimizer': this.optimizer
      }
    }
  }

  _getCompilerInput() {
    return {
      language: 'Solidity',
      sources: this._buildSources(),
      settings: {
        optimizer: {
          enabled: this.optimizer
        },
        outputSelection: {
          '*': {
            "": [
              "legacyAST",
              "ast"
            ],
            "*": [
              "abi",
              "evm.bytecode.object",
              "evm.bytecode.sourceMap",
              "evm.deployedBytecode.object",
              "evm.deployedBytecode.sourceMap"
            ]
          }
        }
      }
    }
  }
}
