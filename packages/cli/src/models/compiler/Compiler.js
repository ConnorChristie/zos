import { Contracts, Logger } from 'zos-lib'
import ProjectCompiler from './solidity/ProjectCompiler'
import SolidityCompiler from './solidity/SolidityCompiler'

const log = new Logger('Compiler')

const DEFAULT_SETTINGS = { optimizer: true, version: SolidityCompiler.latestVersion() }

export default {
  async call() {
    const inputDir = Contracts.getLocalContractsDir()
    const outputDir = Contracts.getLocalBuildDir()
    const options = this.getSettings()
    log.info(`Compiling contracts with ${JSON.stringify(options)} ...`)
    const projectCompiler = new ProjectCompiler(inputDir, outputDir, options)
    await projectCompiler.call()
  },

  getSettings() {
    return this.settings || DEFAULT_SETTINGS
  },

  setSettings(settings) {
    this.settings = { ...this.getSettings(), ...settings }
  }
}
