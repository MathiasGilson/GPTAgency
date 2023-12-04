import readline from "readline"
import OpenAI from "openai"
import fs from "fs"
import { PROJECT_MANAGER } from "./constants"

import Assistants from "./assistants"
import Tools from "./tools"

const threadHistoryPath = ".thread_history"

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

let currentRunId = null
let currentThreadId = null

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY // Make sure to set your OpenAI API key in the environment variables
})

process.on("SIGINT", () => {
    console.log("Closing...")
    if (currentRunId) {
        console.log(`Cancelling run ${currentRunId}...`)
        openai.beta.threads.runs.cancel(currentThreadId, currentRunId)
    }
    process.exit()
})

export async function callAssistant({ assistantId = null, prompt = "", threadId = null }) {
    if (!threadId) {
        if (!assistantId) {
            // first time, check for previous threads
            // list runs
            threadId = await listThreads()
            if (threadId) {
                const runs = await openai.beta.threads.runs.list(threadId, { limit: 1 })
                const lastRun = runs.data[0]
                if (lastRun && ["queued", "in_progress", "requires_action"].includes(lastRun.status)) {
                    const lastRunId = lastRun.id
                    console.log(`Cancelling last run ${lastRunId}...`)
                    await openai.beta.threads.runs.cancel(threadId, lastRunId)
                }
            }
        }
        if (!threadId) {
            // Create a thread
            const thread = await openai.beta.threads.create()
            threadId = thread.id
            console.log(`Created thread ${threadId}`)
            await updateThreadHistory(threadId)
        } else {
            console.log(`Resuming thread ${threadId}`)
        }
    }

    if (!assistantId) {
        // default to software architect assistant to start
        console.log(`\n\nCurrent folder path: ${process.cwd()}`)
        return rl.question("What would you like to do in your current project? \n\n", (prompt) =>
            processAndContinue({ threadId, prompt, assistantId: PROJECT_MANAGER })
        )
    }

    return processPrompt({ threadId, prompt, assistantId })
}

const updateThreadHistory = async (threadId) => {
    const date = new Date().toISOString()
    const historyEntry = `${threadId} - ${date}\n`
    fs.appendFile(threadHistoryPath, historyEntry, (err) => {
        if (err) {
            console.error("An error occurred while updating the thread history:", err)
        }
    })
}

// thread_6ACaGrXgf8Brbkznt62GYnd6

const listThreads = async () => {
    if (fs.existsSync(threadHistoryPath)) {
        const data = await fs.promises.readFile(threadHistoryPath, "utf8")
        const threads = data.trim().split("\n").reverse().slice(0, 5)
        if (threads.length > 0) {
            console.log("\nSelect a previous thread ID to resume:")
            threads.forEach((thread, index) => {
                console.log(`\n>> ${index + 1}. ${thread}`)
            })
            const selected: string = await new Promise((resolve) =>
                rl.question(
                    "\n\nEnter the number of the thread to resume or press Enter to start a new thread: ",
                    resolve
                )
            )
            const selectedIndex = parseInt(selected, 10) - 1
            if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < threads.length) {
                return threads[selectedIndex].split(" - ")[0]
            }
        }
    }
    return null
}

const processAndContinue = async ({ threadId, prompt, assistantId }) => {
    const responseObject = await processPrompt({ threadId, prompt, assistantId })
    const question = responseObject[0].text.value + "\n\n"
    process.stdout.write("\n\n") // Move to the next line after loader
    rl.question(question, (nextPrompt) => processAndContinue({ threadId, prompt: nextPrompt, assistantId }))
}

async function processPrompt({ threadId, prompt, assistantId }) {
    // Add the user's message to the thread
    await openai.beta.threads.messages.create(threadId, { role: "user", content: prompt })

    // Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId
    })

    currentRunId = run.id
    currentThreadId = threadId

    // Wait for the assistant's response
    return waitForResponse(threadId, run.id)
}

const waitForResponse = async (threadId, runId) =>
    new Promise((resolve, reject) => {
        // Start loader
        let loaderIndex = 0
        const loaderSymbols = ["|", "/", "-", "\\"]
        process.stdout.write("\n\n") // Move to the next line after loader
        const loader = setInterval(() => {
            process.stdout.write(`\rWaiting for assistant's response ${loaderSymbols[loaderIndex]}`)
            loaderIndex = (loaderIndex + 1) % loaderSymbols.length
        }, 50)

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
                    console.log(`Assistant response:`, response)
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
                // cancel the run
                await openai.beta.threads.runs.cancel(threadId, runId)
                return reject(e)
            }
        }, 500)
    })

interface Tool {
    id: string
    type: string
    function: {
        name: string
        arguments: string
    }
}
const callTool = async (tool: Tool) => {
    if (tool.type === "function") {
        let args
        try {
            args = JSON.parse(tool.function.arguments)
        } catch (e) {
            console.error("An error occurred parsing arguments:", e)
            return
        }

        console.log("\n\n")

        if (tool.function.name.startsWith("call_")) {
            // This is a call to another assistant
            const callAssistant = Assistants[tool.function.name]
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
        const matchingTool = Tools[tool.function.name]
        if (!matchingTool) {
            throw new Error(`Tool ${tool.function.name} not found`)
        }

        const output = await matchingTool(args)
        console.log("Tool output:", output)
        return { tool_call_id: tool.id, output }
    }
}

callAssistant({})
