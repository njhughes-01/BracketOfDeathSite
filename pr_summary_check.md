## Summary of Changes

Hello @njhughes-01, I'm Gemini Code Assist[^1]! I'm currently reviewing this pull request and will post my feedback shortly. In the meantime, here's a summary to help you and other reviewers quickly get up to speed!

This pull request primarily focuses on enhancing the application's security and maintaining its health by performing comprehensive dependency upgrades. It addresses identified security vulnerabilities and ensures that both frontend and backend components are running on up-to-date libraries. Additionally, it includes targeted fixes for a specific XSS test case and a data consumption error in the Rankings page, contributing to the overall stability and correctness of the application.

### Highlights

* **Security Updates**: Addressed security vulnerabilities identified by npm audit by upgrading various frontend and backend dependencies.
* **Dependency Upgrades**: Updated numerous dependencies across the frontend and backend to their latest versions, ensuring compatibility and leveraging new features.
* **XSS Test Fix**: Corrected an XSS test case in `sanitization.test.ts` to reflect a more robust HTML tag escaping mechanism in the `sanitizeString` utility.
* **Rankings.tsx Type Error Fix**: Resolved a data handling issue in `Rankings.tsx` by correctly extracting the `data` property from the API response when setting the available year range.

≡ƒºá **New Feature in Public Preview:** You can now enable **Memory** to help **Gemini Code Assist** learn from your team's feedback. This makes future code reviews more consistent and personalized to your project's style. **Click [here](https://codeassist.google/code-review/login) to enable Memory in your admin console.**







<details>
<summary><b>Using Gemini Code Assist</b></summary>
<br>

The full guide for Gemini Code Assist can be found on our [documentation page](https://developers.google.com/gemini-code-assist/docs/review-github-code), here are some quick tips.

<b>Invoking Gemini</b>

You can request assistance from Gemini at any point by creating a comment using either `/gemini <command>` or `@gemini-code-assist <command>`. Below is a summary of the supported commands on the current page.

Feature | Command | Description
--- | --- | ---
Code Review | `/gemini review` | Performs a code review for the current pull request in its current state.
Pull Request Summary | `/gemini summary` | Provides a summary of the current pull request in its current state.
Comment | @gemini-code-assist | Responds in comments when explicitly tagged, both in pull request comments and review comments.
Help | `/gemini help` | Displays a list of available commands.

<b>Customization</b>

To customize Gemini Code Assist for GitHub experience, repository maintainers can create a configuration file and/or provide a custom code review style guide (such as PEP-8 for Python) by creating and adding files to a `.gemini/` folder in the base of the repository. Detailed instructions can be found [here](https://developers.google.com/gemini-code-assist/docs/customize-gemini-behavior-github).

<b>Limitations & Feedback</b>

Gemini Code Assist may make mistakes. Please leave feedback on any instances where its feedback is incorrect or counter productive. You can react with :thumbsup: and :thumbsdown: on @gemini-code-assist comments. If you're interested in giving your feedback about your experience with Gemini Code Assist for Github and other Google products, sign up [here](https://google.qualtrics.com/jfe/form/SV_2cyuGuTWsEw84yG).

<b>You can also get AI-powered code generation, chat, as well as code reviews directly in the IDE at no cost with the [Gemini Code Assist IDE Extension](https://cloud.google.com/products/gemini/code-assist).</b>
</details>




[^1]: Review the [Privacy Notices](https://policies.google.com/privacy), [Generative AI Prohibited Use Policy](https://policies.google.com/terms/generative-ai/use-policy), [Terms of Service](https://policies.google.com/terms), and learn how to configure Gemini Code Assist in GitHub [here](https://developers.google.com/gemini-code-assist/docs/customize-gemini-behavior-github). Gemini can make mistakes, so double check it and [use code with caution](https://support.google.com/legal/answer/13505487).

