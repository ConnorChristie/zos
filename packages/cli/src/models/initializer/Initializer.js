import { ZWeb3, Contracts } from 'zos-lib'
import Session from '../network/Session'
import TruffleConfig from './truffle/TruffleConfig'

export default {
  initStaticConfiguration() {
    const buildDir = TruffleConfig.buildDir()
    Contracts.setLocalBuildDir(buildDir)
  },

  async initNetworkConfiguration(options) {
    const { network, from, timeout } = Session.getOptions(options)
    if (!network) throw Error('A network name must be provided to execute the requested action.')

    // this line could be expanded to support different libraries like embark, ethjs, buidler, etc
    const { provider, artifactDefaults } = TruffleConfig.loadProviderAndDefaults(network)

    ZWeb3.initialize(provider)
    Contracts.setSyncTimeout(timeout * 1000)
    Contracts.setArtifactsDefaults(artifactDefaults)
    this.initStaticConfiguration()

    const txParams = from ? { from } : { from: await ZWeb3.defaultAccount() }
    return { network: await ZWeb3.getNetworkName(), txParams }
  }
}
