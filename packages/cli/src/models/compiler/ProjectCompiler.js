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

  call() {
    this._loadSoliditySourcesFromDir(this.inputDir)
    this._compile()
  }

  _loadSoliditySourcesFromDir(dir) {
    fs.readDir(dir).forEach(fileName => {
      const filePath = path.resolve(dir, fileName)
      if (fs.isDir(filePath)) this._loadSoliditySourcesFromDir(filePath)
      else if (this._isSolidityFile(filePath)) {
        const source = "".concat(fs.read(filePath))
        const contract = { fileName, filePath, source }
        this.contracts.push(contract)
      }
    })
  }

  _compile() {
    const solidityCompiler = new SolidityCompiler(this.contracts, this.options)
    this.compilerOutput = solidityCompiler.call()
    if (!fs.exists(this.outputDir)) fs.createDir(this.outputDir)
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
