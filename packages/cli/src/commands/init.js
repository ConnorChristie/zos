'use strict';

import push from './push'
import init from '../scripts/init'

const name = 'init'
const signature = `${name} <project-name> [version]`
const description = `initialize your ZeppelinOS project. Provide a <project-name> and optionally an initial [version] name`

const register = program => program
  .command(signature, { noHelp: true })
  .usage('<project-name> [version]')
  .description(description)
  .option('--publish', 'automatically publishes your project upon pushing it to a network')
  .option('--force', 'overwrite existing project if there is one')
  .option('--link <dependency>', 'link to a dependency')
  .option('--no-install', 'skip installing packages dependencies locally')
  .withPushOptions()
  .action(action)

async function action(name, version, options) {
  const { publish, force, link, install: installDependencies } = options

  const dependencies = link ? link.split(',') : []
  await init({ name, version, dependencies, installDependencies, force, publish })
  await push.tryAction(options)
}

export default { name, signature, description, register, action }
