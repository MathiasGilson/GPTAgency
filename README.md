# GPT Agency
An AI Agency that code entire projects for you. Runs on the latest OpenAI Assistants API.

# ⚠️ Work in progress ⚠️

# How does it work?

Run it from your project repo, it will call a Project Manager assistant that will try to understand what you want to do.

It works on new projects as well as projects containing already a lot of code.

Once your Project Manager Assistant understands what you're trying to achieve, it will call a Sofware Architect Assistant that will decide the best way to implement your ideas.

It will then call one or multiple Software Engineers Assistants to implement your change. be careful they will modify your files directly and can also delete files so make sure that your work is committed.

The Software Engineers will then call a Code Reviewer Assistant that will give them feedback on how to improve the code they wrote. Once they've improved their code they will call the project manager assistant that will decide with you what to do next.

# Getting started

NPM package coming soon

### Set your OpenAI API key in the .env file

### Run the command line
`npx ts-node index.ts`
