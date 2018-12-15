'use strict';

process.env.NODE_ENV = 'test'

require('chai')
  .use(require('cc-zos-lib').assertions)
  .should()
