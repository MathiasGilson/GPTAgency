import readline from "readline"
import OpenAI from "openai"
import fs from "fs"

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY // Make sure to set your OpenAI API key in the environment variables
})

const SOFTWARE_ARCHITECT_ASSISTANT_ID = "asst_jftO66hPuDIj6I01oYrkBZ2Q"
const SOFTWARE_ENGINEER_ASSISTANT_ID = "asst_NIavcQKJhDam0sZ6fImYn4Yp"

async function callAssistant({ assistantId = null, prompt = "", threadId = null }) {
    if (!threadId) {
        // Create a thread
        const thread = await openai.beta.threads.create()
        threadId = thread.id
        console.log(`Created thread ${threadId}`)
    }
    if (!assistantId) {
        // default to software architect assistant to start
        return rl.question("What would you like to do in your current folder? ", (prompt) =>
            processPrompt({ threadId, prompt, assistantId: SOFTWARE_ARCHITECT_ASSISTANT_ID })
        )
    }
    return processPrompt({ threadId, prompt, assistantId })
}

async function processPrompt({ threadId, prompt, assistantId }) {
    // Add the user's message to the thread
    await openai.beta.threads.messages.create(threadId, { role: "user", content: prompt })

    // Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId
    })

    // Wait for the assistant's response
    return waitForResponse(threadId, run.id)
}

const waitForResponse = async (threadId, runId) =>
    new Promise((resolve, reject) => {
        // Start loader
        let loaderIndex = 0
        const loaderSymbols = ["|", "/", "-", "\\"]
        const loader = setInterval(() => {
            process.stdout.write(`\rWaiting for assistant's response ${loaderSymbols[loaderIndex]}`)
            loaderIndex = (loaderIndex + 1) % loaderSymbols.length
        }, 250)

        // Poll every second to check for a response
        const pollForResponse = setInterval(async () => {
            try {
                const updatedRun = await openai.beta.threads.runs.retrieve(threadId, runId)

                if (updatedRun.status === "in_progress") {
                    return
                }

                clearInterval(pollForResponse)
                clearInterval(loader)
                console.log(JSON.stringify(updatedRun, null, 2))

                if (updatedRun.status === "failed") {
                    console.error("An error occurred:", updatedRun.last_error.message)
                    return reject(updatedRun.last_error.message)
                }

                if (updatedRun.status === "completed") {
                    process.stdout.write("\n") // Move to the next line after loader
                    const messagesResponse = await openai.beta.threads.messages.list(threadId)

                    // Display the assistant's response
                    const assistantResponse = messagesResponse.data.find((m) => m.role === "assistant")
                    const response = assistantResponse?.content ?? "No response"
                    console.log(`Assistant response: ${response}`)
                    return resolve(response)
                }

                if (updatedRun.status === "requires_action") {
                    if (updatedRun.required_action.type === "submit_tool_outputs") {
                        return Promise.all(
                            updatedRun.required_action.submit_tool_outputs.tool_calls.map((tool) => callTool(tool))
                        ).then(async (results) => {
                            try {
                                await openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
                                    tool_outputs: results
                                })
                            } catch (e) {
                                console.error(
                                    `An error occurred while submitting tools responses from thread ${threadId}`,
                                    e
                                )
                                clearInterval(pollForResponse)
                                clearInterval(loader)
                                reject(e)
                            }

                            const response = await waitForResponse(threadId, runId)
                            return resolve(response)
                        })
                    }
                }
            } catch (e) {
                console.error("An error occurred:", e)
                clearInterval(pollForResponse)
                clearInterval(loader)
                reject(e)
            }
        }, 500)
    })

interface Tool {
    id: string
    type: string
    function: {
        name: string
        arguments: object
    }
}
const callTool = async (tool) => {
    if (tool.type === "function") {
        let args
        try {
            args = JSON.parse(tool.function.arguments)
        } catch (e) {
            console.error("An error occurred parsing arguments:", e)
            return
        }

        if (tool.function.name.startsWith("call_")) {
            // This is a call to another assistant
            const callAssistant = ASSISTANTS[tool.function.name]
            if (!callAssistant) {
                throw new Error(`Assistant ${tool.function.name} not found`)
            }
            const output = await callAssistant(args)
            console.log("Assistant output:", output)
            return {
                tool_call_id: tool.id,
                output
            }
        }

        // This is a call to a tool
        const matchingTool = TOOLS[tool.function.name]
        if (!matchingTool) {
            throw new Error(`Tool ${tool.function.name} not found`)
        }

        const output = await matchingTool(args)
        console.log("Tool output:", output)
        return { tool_call_id: tool.id, output }
    }
}

const ASSISTANTS = {
    call_software_engineer: (args: { files: string[]; featureDetails: string; createFiles: string[] }) => {
        return new Promise((resolve, reject) => {
            let prompt = `Implement this features. ${args.featureDetails}`
            if (args.files.length > 0) {
                prompt += `. Use the following files for this feature: ${args.files.join(", ")}`
            }
            if (args.createFiles.length > 0) {
                prompt += `. Create the following files for this feature: ${args.createFiles.join(", ")}`
            }
            return callAssistant({ assistantId: SOFTWARE_ENGINEER_ASSISTANT_ID, prompt }).then(resolve).catch(reject)
        })
    },
    call_project_manager: (args: { message: string }) => {
        return new Promise((resolve) => {
            console.log("Calling project manager:", args)
            resolve("Called project manager")
        })
    }
}

const TOOLS = {
    call_software_engineer: (args: { files: string[]; featureDetails: string; createFiles: string[] }, threadId) => {
        return new Promise((resolve, reject) => {
            let prompt = `Implement this features. ${args.featureDetails}`
            if (args.files.length > 0) {
                prompt += `. Use the following files for this feature: ${args.files.join(", ")}`
            }
            if (args.createFiles.length > 0) {
                prompt += `. Create the following files for this feature: ${args.createFiles.join(", ")}`
            }
            callAssistant({ assistantId: SOFTWARE_ENGINEER_ASSISTANT_ID, prompt, threadId }).then(resolve).catch(reject)
        })
    },
    call_project_manager: (args: { message: string }) => {
        return new Promise((resolve) => {
            console.log("Calling project manager:", args)
            resolve("Called project manager")
        })
    },
    list_files: () => {
        return new Promise((resolve, reject) => {
            fs.readdir(".", (err, files) => {
                if (err) {
                    console.error("An error occurred:", err)
                    reject(err)
                    return
                }
                console.log("Listing files in current directory:")
                resolve(files)
            })
        })
    },
    create_file: (args: { filePath: string; content: string }) => {
        return new Promise((resolve, reject) => {
            fs.writeFile(args.filePath, args.content, (err) => {
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

callAssistant({})
