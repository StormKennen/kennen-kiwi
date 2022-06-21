"use strict";
/**
 * @author doubledream
 * @desc 文件处理方法
 */
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const utils_1 = require("./utils");
/**
 * 获取文件夹下符合要求的所有文件
 * @function getSpecifiedFiles
 * @param  {string} dir 路径
 * @param {ignoreDirectory} 忽略文件夹 {ignoreFile} 忽略的文件
 */
function getSpecifiedFiles(oldDir, ignoreDirectory = "", ignoreFile = "") {
  let dir = oldDir;
  const ignoreFileDir = ignoreDirectory?.split(",") || [];
  // 忽略的目录，不进入逻辑，避免不必要的扫描处理
  const dirArr = dir.split(",").filter((t) => {
    const basename = path.basename(t);
    let otherPath = t
    if (/\w+\.+\w+/.test(basename)) {
      otherPath = t.replace(basename, "");
    }
    return !ignoreFileDir.some((i) => otherPath.includes(i));
  });
  if (dirArr.length === 0) {
    return []
  }
  dir = dirArr.join();
  return fs.readdirSync(dir).reduce((files, file) => {
    try {
      const name = path.join(dir, file);
      const isDirectory = fs.statSync(name).isDirectory();
      const isFile = fs.statSync(name).isFile();
      if (isDirectory) {
        return files.concat(
          getSpecifiedFiles(name, ignoreDirectory, ignoreFile)
        );
      }

      const isIgnoreFile =
        !ignoreFile ||
        (ignoreFile && !ignoreFile.split(",").includes(path.basename(name))); //  (ignoreFile && path.basename(name) !== ignoreFile);
      if (isFile && isIgnoreFile) {
        return files.concat(name);
      }
      return files;
    } catch (e) {
      utils_1.failInfo(e);
      return files;
    }
  }, []);
}
exports.getSpecifiedFiles = getSpecifiedFiles;
/**
 * 读取文件
 * @param fileName
 */
function readFile(fileName) {
  if (fs.existsSync(fileName)) {
    return fs.readFileSync(fileName, "utf-8");
  }
}
exports.readFile = readFile;
/**
 * 读取文件
 * @param fileName
 */
function writeFile(filePath, file) {
  // if (fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, file);
  // }
}
exports.writeFile = writeFile;
/**
 * 判断是文件
 * @param path
 */
function isFile(path) {
  return fs.statSync(path).isFile();
}
exports.isFile = isFile;
/**
 * 判断是文件夹
 * @param path
 */
function isDirectory(path) {
  return fs.statSync(path).isDirectory();
}
exports.isDirectory = isDirectory;
//# sourceMappingURL=file.js.map
