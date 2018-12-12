import { FileSystem, Contracts, Logger } from 'zos-lib'
import TruffleConfig from '../initializer/truffle/TruffleConfig'
import SolidityProjectCompiler from './solidity/SolidityProjectCompiler'
import SolidityContractsCompiler from './solidity/SolidityContractsCompiler'

const log = new Logger('Compiler')

const DEFAULT_SETTINGS = {
  optimizer: {
    runs: 200,
    enabled: false,
  },
  evmVersion: 'byzantium',
  version: SolidityContractsCompiler.latestVersion()
}

export default {
  async call() {
    return this._isTruffleProject()
      ? this.compileWithTruffle()
      : this.compileWithSolc()
  },

  getSettings() {
    return this.settings || DEFAULT_SETTINGS
  },

  setSettings(settings) {
    this.settings = { ...this.getSettings(), ...settings }
  },

  async compileWithSolc() {
    const inputDir = Contracts.getLocalContractsDir()
    const outputDir = Contracts.getLocalBuildDir()
    const options = this.getSettings()
    const projectCompiler = new SolidityProjectCompiler(inputDir, outputDir, options)
    log.info('Compiling contracts...')
    await projectCompiler.call()
  },

  async compileWithTruffle() {
    const TruffleCompile = require('truffle-workflow-compile')
    const config = await TruffleConfig.init()
    config.all = true
    return new Promise((resolve, reject) =>
      TruffleCompile.compile(config, (error, abstractions, paths) =>
        error ? reject(error) : resolve(abstractions, paths)
      )
    )
  },

  _isTruffleProject() {
    const truffleDir = `${process.cwd()}/node_modules/truffle`
    return TruffleConfig.exists() && FileSystem.exists(truffleDir)
  }
}
