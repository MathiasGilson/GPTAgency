import fs from "fs"
import path from "path"
import { minimatch } from "minimatch"

export default {
    list_files: function (dir = ".") {
        return new Promise((resolve) => {
            console.log("🗄️ Listing files in current directory...")
            fs.readdir(dir, { withFileTypes: true }, (err, entries) => {
                if (err) {
                    console.error("An error occurred:", err)
                    return resolve(`Listing failed with error ${err.message}`)
                }
                let files = []
                const promises = []
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name)
                    if (entry.isDirectory()) {
                        promises.push(this.list_files(fullPath))
                    } else {
                        files.push(fullPath)
                    }
                }
                if (fs.existsSync(".gitignore")) {
                    const gitignore = fs
                        .readFileSync(".gitignore", "utf-8")
                        .split("\n")
                        .filter(Boolean)
                        .map((line) => line.trim())
                    files = files.filter((file) => !gitignore.some((ignore) => minimatch(file, ignore)))
                }
                return Promise.all(promises)
                    .then((nestedFiles) => {
                        const allFiles = files.concat(...nestedFiles)
                        resolve(JSON.stringify(allFiles))
                    })
                    .catch((error) => resolve(`Listing failed with error ${error.message}`))
            })
        })
    },
    create_file: (args: { filePath: string }) => {
        return new Promise((resolve) => {
            console.log(`📝 Creating file ${args.filePath}...`)
            fs.writeFile(args.filePath, "", (err) => {
                if (err) {
                    console.error("An error occurred:", err)
                    if (err.code === "ENOENT") {
                        return resolve(`File ${args.filePath} does not exist.`)
                    }
                    return resolve(`Creation failed with error ${err.message}`)
                }
                console.log(`File ${args.filePath} created successfully.`)
                resolve(`File ${args.filePath} created successfully.`)
            })
        })
    },
    delete_file: (args: { filePath: string }) => {
        return new Promise((resolve) => {
            console.log(`❌ Deleting file ${args.filePath}...`)
            fs.unlink(args.filePath, (err) => {
                if (err) {
                    console.error("An error occurred:", err)
                    if (err.code === "ENOENT") {
                        return resolve(`File ${args.filePath} does not exist.`)
                    }
                    return resolve(`Deletion failed with error ${err.message}`)
                }
                console.log(`File ${args.filePath} deleted successfully.`)
                resolve(`File ${args.filePath} deleted successfully.`)
            })
        })
    },
    rename_file: (args: { filePath: string; newFilePath: string }) => {
        return new Promise((resolve) => {
            console.log(`📝 Renaming file ${args.filePath} to ${args.newFilePath}...`)
            fs.rename(args.filePath, args.newFilePath, (err) => {
                if (err) {
                    console.error("An error occurred:", err)
                    if (err.code === "ENOENT") {
                        return resolve(`File ${args.filePath} does not exist.`)
                    }
                    return resolve(`Renaming failed with error ${err.message}`)
                }
                console.log(`File ${args.filePath} renamed to ${args.newFilePath} successfully.`)
                resolve(`File ${args.filePath} renamed to ${args.newFilePath} successfully.`)
            })
        })
    },
    read_file: (args: { filePath: string }) => {
        return new Promise((resolve) => {
            console.log(`📖 Reading file ${args.filePath}...`)
            fs.readFile(args.filePath, "utf8", (err, data) => {
                if (err) {
                    console.error("An error occurred:", err)
                    if (err.code === "ENOENT") {
                        return resolve(`File ${args.filePath} does not exist.`)
                    }
                    return resolve(`Reading failed with error ${err.message}`)
                }
                const lines = data.split("\n").map((line, index) => `${index + 1}: ${line}`)
                const numberedData = lines.join("\n")
                console.log(`File ${args.filePath} contents:\n${numberedData}`)
                resolve(numberedData)
            })
        })
    },
    patch_file: (args: {
        filePath: string
        patches: [
            {
                fromLine: number
                toLine: number
                replacementLines: string[]
            }
        ]
    }) => {
        return new Promise((resolve) => {
            console.log(`📝 Patching file ${args.filePath}...`)
            fs.readFile(args.filePath, "utf8", (err, data) => {
                if (err) {
                    console.error("An error occurred:", err)
                    if (err.code === "ENOENT") {
                        return resolve(`File ${args.filePath} does not exist.`)
                    }
                    return resolve(`Patching failed with error ${err.message}`)
                }

                const lines = data.split("\n")
                args.patches.forEach(({ fromLine, toLine, replacementLines }) => {
                    lines.splice(fromLine, toLine - fromLine, ...replacementLines)
                })
                const newData = lines.join("\n")
                fs.writeFile(args.filePath, newData, (err) => {
                    if (err) {
                        console.error("An error occurred:", err)
                        if (err.code === "ENOENT") {
                            return resolve(`File ${args.filePath} does not exist.`)
                        }
                        return resolve(`Patching failed with error ${err.message}`)
                    }
                    console.log(`File ${args.filePath} patched successfully.`)
                    resolve(`File ${args.filePath} patched successfully.`)
                })
            })
        })
    }
}
