import fs from "fs"
import path from "path"
import { minimatch } from "minimatch"

export default {
    list_files: (
        args: { folderPath: string } = {
            folderPath: "."
        }
    ) => {
        return new Promise((resolve) => {
            console.log("🗄️ Listing files in current directory...")

            let gitignore = [".git", "node_modules", "dist", "build", "yarn.lock", "package-lock.json", ".gitignore"]
            if (fs.existsSync(".gitignore")) {
                gitignore = gitignore.concat(
                    fs
                        .readFileSync(".gitignore", "utf-8")
                        .split("\n")
                        .filter(Boolean)
                        .map((line) => line.trim())
                )
            }

            const listFiles = (dir: string, fileSet = new Set<string>()) =>
                new Promise((resolve) => {
                    fs.readdir(dir, { withFileTypes: true }, (err, entries) => {
                        if (err) {
                            console.error("An error occurred:", err)
                            return resolve(`Listing failed with error ${err.message}`)
                        }
                        const promises = []

                        for (const entry of entries) {
                            const fullPath = path.join(dir, entry.name)
                            if (!gitignore.some((ignore) => minimatch(fullPath, ignore))) {
                                if (entry.isDirectory()) {
                                    promises.push(listFiles(fullPath, fileSet))
                                } else if (!fileSet.has(fullPath)) {
                                    fileSet.add(fullPath)
                                }
                            }
                        }

                        return Promise.all(promises)
                            .then(() => resolve(Array.from(fileSet)))
                            .catch(console.error)
                    })
                })

            return listFiles(args.folderPath, new Set<string>())
                .then((files) => {
                    console.log(`Files listed successfully.`, files)
                    return resolve(JSON.stringify(files))
                })
                .catch((error) => resolve(`Listing failed with error ${error.message}`))
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
