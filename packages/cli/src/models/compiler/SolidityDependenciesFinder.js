import path from 'path'
import { FileSystem } from 'zos-lib'

export default {
  call(dependencyPath) {
    const rootDir = process.cwd()
    const dependencyName = this._getFileName(dependencyPath)
    const fileNames = FileSystem.readDir(rootDir)

    for (const fileName of fileNames) {
      const filePath = path.resolve(rootDir, fileName)
      if (fileName === dependencyName) return this._buildContract(filePath, fileName)
      if (FileSystem.isDir(filePath)) {
        const dependencyContract = this._findDependencyContract(filePath, dependencyName)
        if (dependencyContract) return dependencyContract
      }
    }
  },

  _findDependencyContract(filePath, fileName, dependencyName) {
    if (fileName === dependencyName) return this._buildContract(filePath, fileName)
    else if (FileSystem.isDir(filePath)) {
      const subFileNames = FileSystem.readDir(filePath)
      for (const subFileName of subFileNames) {
        const subFilePath = path.resolve(filePath, subFileName)
        const result = this._findDependencyContract(subFilePath, subFileName, dependencyName)
        if (result) return result
      }
    }
  },

  _buildContract(filePath, fileName) {
    const source = "".concat(fs.read(filePath))
    return { fileName, filePath, source }
  },

  _getFileName(filePath) {
    return filePath.substring(filePath.lastIndexOf('/') + 1)
  },
}
