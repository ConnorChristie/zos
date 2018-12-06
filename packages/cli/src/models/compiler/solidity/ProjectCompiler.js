import path from 'path'
import { FileSystem as fs } from 'zos-lib'
import SolidityCompiler from './SolidityCompiler'

export default class ProjectCompiler {
  constructor(input, output, options = {}) {
    this.inputDir = input
    this.outputDir = output
    this.contracts = []
    this.compilerOutput = []
    this.options = options
  }

  async call() {
    this._loadSoliditySourcesFromDir(this.inputDir)
    await this._compile()
  }

  _loadSoliditySourcesFromDir(dir) {
    fs.readDir(dir).forEach(fileName => {
      const filePath = path.resolve(dir, fileName)
      if (fs.isDir(filePath)) this._loadSoliditySourcesFromDir(filePath)
      else if (this._isSolidityFile(filePath)) {
        const source = fs.read(filePath, 'utf-8')
        const contract = { fileName, filePath, source }
        this.contracts.push(contract)
      }
    })
  }

  async _compile() {
    const solidityCompiler = new SolidityCompiler(this.contracts, this.options)
    this.compilerOutput = await solidityCompiler.call()
    if (!fs.exists(this.outputDir)) fs.createDirPath(process.cwd(), this.outputDir)
    this.compilerOutput.forEach(data => {
      const buildFileName = `${this.outputDir}/${data.contractName}.json`
      fs.writeJson(buildFileName, data)
    })
  }

  _isSolidityFile(fileName) {
    const solidityExtension = '.sol'
    const fileExtension = path.extname(fileName).toLowerCase()
    return fileExtension === solidityExtension
  }
}
