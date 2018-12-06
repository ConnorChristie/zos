import { Contracts, Logger } from 'zos-lib'
import ProjectCompiler from './ProjectCompiler'

const log = new Logger('compile')

export default async function compile() {
  log.info('Compiling contracts...')
  const inputDir = Contracts.getLocalContractsDir()
  const outputDir = Contracts.getLocalBuildDir()
  new ProjectCompiler(inputDir, outputDir, { optimized: true }).call()
}
