import { callAssistant } from "./index"
import {
    DEVELOPER,
    PROJECT_ARCHITECT,
    PROJECT_MANAGER,
    CODE_REVIEWER,
    FEATURE_ARCHITECT,
    FEATURE_ARCHITECT_REVIEWER
} from "./constants"

export default {
    call_project_manager: (args: { message: string }) => {
        return new Promise((resolve, reject) => {
            console.log("🤵🏻‍♂️ Calling project manager:", args)
            return callAssistant({ assistantId: PROJECT_MANAGER, prompt: args.message })
                .then((res) => resolve(res[0].text.value))
                .catch(reject)
        })
    },
    call_project_architect: (args: { requirements: string }) => {
        return new Promise((resolve, reject) => {
            console.log("👨🏻‍💼 Calling project architect:", args)
            return callAssistant({ assistantId: PROJECT_ARCHITECT, prompt: args.requirements })
                .then((res) => resolve(res[0].text.value))
                .catch(reject)
        })
    },
    call_feature_architect: (args: { files: string[]; featureDetails: string; createFiles: string[] }) => {
        return new Promise((resolve, reject) => {
            console.log("👩🏻‍🔧 Calling feature architect reviewer:", args)
            let prompt = `Give an implementation proposal for this feature: ${args.featureDetails}`
            if (args.files.length > 0) {
                prompt += `. Use the following files: ${args.files.join(", ")}`
            }
            if (args.createFiles.length > 0) {
                prompt += `. Files to create: ${args.createFiles.join(", ")}`
            }
            return callAssistant({ assistantId: FEATURE_ARCHITECT, prompt })
                .then((res) => resolve(res[0].text.value))
                .catch(reject)
        })
    },
    call_feature_architect_reviewer: (args: { files: string[]; featureDetails: string; createFiles: string[] }) => {
        return new Promise((resolve, reject) => {
            console.log("🧑🏻‍🔬 Calling feature architect reviewer:", args)
            let prompt = `Implementation proposal: ${args.featureDetails}`
            if (args.files.length > 0) {
                prompt += `. Use the following files: ${args.files.join(", ")}`
            }
            if (args.createFiles.length > 0) {
                prompt += `. Files to create: ${args.createFiles.join(", ")}`
            }
            return callAssistant({ assistantId: FEATURE_ARCHITECT_REVIEWER, prompt })
                .then((res) => resolve(res[0].text.value))
                .catch(reject)
        })
    },
    call_developer: (args: { files: string[]; featureDetails: string; createFiles: string[] }) => {
        return new Promise((resolve, reject) => {
            console.log("👨🏻‍💻 Calling developer:", args)
            let prompt = `Feature to implement: ${args.featureDetails}`
            if (args.files.length > 0) {
                prompt += `. Use the following files for this feature: ${args.files.join(", ")}`
            }
            if (args.createFiles.length > 0) {
                prompt += `. Create the following files for this feature: ${args.createFiles.join(", ")}`
            }
            return callAssistant({ assistantId: DEVELOPER, prompt })
                .then((res) => resolve(res[0].text.value))
                .catch(reject)
        })
    },
    call_code_reviewer: (args: { implementationReport: string }) => {
        return new Promise((resolve, reject) => {
            return callAssistant({ assistantId: CODE_REVIEWER, prompt: args.implementationReport })
                .then((res) => resolve(res[0].text.value))
                .catch(reject)
        })
    }
}
