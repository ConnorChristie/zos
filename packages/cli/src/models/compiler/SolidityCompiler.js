import solc from 'solc'
import { Logger, FileSystem } from 'zos-lib'
import SolidityDependenciesFinder from './SolidityDependenciesFinder'

const log = new Logger('SolidityCompiler')

export default class SolidityCompiler {
  static latestVersion() {
    return solc.version()
  }

  constructor(contracts, { version, optimized = true }) {
    this.errors = []
    this.version = version || SolidityCompiler.latestVersion()
    this.contracts = contracts
    this.optimized = optimized
    this.solcOutput = {}
  }

  call() {
    this._compile()
    return this._buildContractsData()
  }

  _compile() {
    const optimizer = this.optimized ? 1 : 0
    const sources = this._buildSources()
    this.solcOutput = solc.compile({ sources }, optimizer, dep => this._findDependency(dep, this))
    if (this.solcOutput.errors) log.error(this.solcOutput.errors)
  }

  _buildSources() {
    return this.contracts.reduce((sources, contract) => {
      log.info(`Compiling ${contract.fileName} ...`)
      sources[contract.fileName] = contract.source
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

  _buildContractsData() {
    return Object.keys(this.solcOutput.contracts).map(key => {
      const [filePath, contractName] = key.split(':')
      return this._buildContractData(key, filePath, contractName)
    })
  }

  _buildContractData(key, filePath, contractName) {
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1)
    const output = this.solcOutput.contracts[key]
    const contract = this.contracts.find(contract => contract.fileName === fileName)
    return {
      fileName,
      contractName,
      source: contract.source,
      sourcePath: contract.filePath,
      sourceMap: output.srcmap,
      abi: JSON.parse(output.interface),
      ast: this.solcOutput.sources[fileName].AST,
      legacyAST: this.solcOutput.sources[fileName].legacyAST,
      bytecode: `0x${output.bytecode}`,
      deployedBytecode: `0x${output.deployedBytecode}`,
      compiler: {
        'name': 'solc',
        'version': this.version
      }
    }
  }
}
