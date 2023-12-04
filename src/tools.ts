import fs from "fs"

export default {
    list_files: () => {
        return new Promise((resolve, reject) => {
            fs.readdir(".", (err, files) => {
                if (err) {
                    console.error("An error occurred:", err)
                    reject(err)
                    return
                }
                console.log("Listing files in current directory:")
                resolve(JSON.stringify(files))
            })
        })
    },
    create_file: (args: { filePath: string }) => {
        return new Promise((resolve, reject) => {
            fs.writeFile(args.filePath, "", (err) => {
                if (err) {
                    console.error("An error occurred:", err)
                    reject(err)
                    return
                }
                console.log(`File ${args.filePath} created successfully.`)
                resolve(`File ${args.filePath} created successfully.`)
            })
        })
    },
    delete_file: (args: { filePath: string }) => {
        return new Promise((resolve, reject) => {
            fs.unlink(args.filePath, (err) => {
                if (err) {
                    console.error("An error occurred:", err)
                    reject(err)
                    return
                }
                console.log(`File ${args.filePath} deleted successfully.`)
                resolve(`File ${args.filePath} deleted successfully.`)
            })
        })
    },
    rename_file: (args: { filePath: string; newFilePath: string }) => {
        return new Promise((resolve, reject) => {
            fs.rename(args.filePath, args.newFilePath, (err) => {
                if (err) {
                    console.error("An error occurred:", err)
                    reject(err)
                    return
                }
                console.log(`File ${args.filePath} renamed to ${args.newFilePath} successfully.`)
                resolve(`File ${args.filePath} renamed to ${args.newFilePath} successfully.`)
            })
        })
    },
    read_file: (args: { filePath: string }) => {
        return new Promise((resolve, reject) => {
            fs.readFile(args.filePath, "utf8", (err, data) => {
                if (err) {
                    console.error("An error occurred:", err)
                    reject(err)
                    return
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
        return new Promise((resolve, reject) => {
            fs.readFile(args.filePath, "utf8", (err, data) => {
                if (err) {
                    console.error("An error occurred:", err)
                    reject(err)
                    return
                }

                const lines = data.split("\n")
                args.patches.forEach(({ fromLine, toLine, replacementLines }) => {
                    lines.splice(fromLine, toLine - fromLine, ...replacementLines)
                })
                const newData = lines.join("\n")
                fs.writeFile(args.filePath, newData, (err) => {
                    if (err) {
                        console.error("An error occurred:", err)
                        reject(err)
                        return
                    }
                    console.log(`File ${args.filePath} patched successfully.`)
                    resolve(`File ${args.filePath} patched successfully.`)
                })
            })
        })
    }
}
