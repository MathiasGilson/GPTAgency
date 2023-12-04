import { callAssistant } from "./index"
import { SOFTWARE_ENGINEER_ASSISTANT_ID } from "./constants"

export default {
    call_software_engineer: (args: { files: string[]; featureDetails: string; createFiles: string[] }) => {
        return new Promise((resolve, reject) => {
            let prompt = `Implement this features. ${args.featureDetails}`
            if (args.files.length > 0) {
                prompt += `. Use the following files for this feature: ${args.files.join(", ")}`
            }
            if (args.createFiles.length > 0) {
                prompt += `. Create the following files for this feature: ${args.createFiles.join(", ")}`
            }
            return callAssistant({ assistantId: SOFTWARE_ENGINEER_ASSISTANT_ID, prompt })
                .then((res) => resolve(res[0].text.value))
                .catch(reject)
        })
    },
    call_project_manager: (args: { message: string }) => {
        return new Promise((resolve) => {
            console.log("Calling project manager:", args)
            resolve("Called project manager")
        })
    }
}
