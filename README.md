# NeuroCode

<div align="center">

![NeuroCode Logo](assets/icon.png)

**Free, local, open-source AI app builder**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.44.0--beta.1-blue.svg)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)](package.json)
[![Electron](https://img.shields.io/badge/electron-40.0.0-blue.svg)](package.json)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Development](#development) • [Contributing](#contributing)

</div>

---

## Overview

NeuroCode is a powerful desktop application that enables developers to create and modify web applications through AI-assisted development. Built with Electron, it provides a live preview of your applications while making code changes in real-time, combining chat-based interaction with autonomous AI capabilities.

### Why NeuroCode?

- **🔒 Privacy First:** All processing happens locally on your machine
- **🤖 Multi-AI Support:** Works with OpenAI, Anthropic, Google, Azure, and more
- **⚡ Real-Time Preview:** See your changes instantly in the integrated preview panel
- **🎯 Multiple Modes:** Build, Ask, Plan, and Local Agent modes for different workflows
- **🛠️ Full Stack:** Integrated Git, database management, and deployment tools
- **🎨 Customizable:** Themes, templates, and custom AI model providers

---

## Features

### Core Capabilities

#### 🤖 AI-Powered Development
- **Build Mode:** Interactive code generation and modification with live preview
- **Ask Mode:** Question-answering about your codebase
- **Plan Mode:** AI-assisted planning and task breakdown with requirements gathering
- **Local Agent Mode (Pro):** Autonomous agent that executes tools and makes decisions

#### 💻 Code Editing & Preview
- Monaco editor integration with syntax highlighting
- Live preview panel with responsive device modes (desktop, tablet, mobile)
- Real-time code changes reflected instantly
- Support for multiple file types and frameworks

#### 🔄 Version Control & Git
- Native Git integration (Windows-safe)
- GitHub repository management
- Branch operations and merge conflict resolution
- Commit tracking and versioning

#### 🗄️ Database Integration
- **Supabase:** PostgreSQL database and auth integration
- **Neon:** Serverless PostgreSQL management
- Schema management and migrations
- SQL query execution

#### 🚀 Deployment & Hosting
- Vercel integration for one-click deployment
- Deployment URL tracking
- Environment variable management
- Custom app folders support

#### 🎨 Customization
- AI-generated themes or manual theme creation
- Custom language model providers
- Model Context Protocol (MCP) server integration
- App-specific chat context configuration

#### 🖼️ Media Management
- Built-in media library for app assets
- AI image generation capabilities
- Media file optimization and cleanup
- Persistent media serving with custom protocol

### Advanced Features

- **Context Compaction:** Automatically summarize long conversations
- **Security Review:** AI-powered code security analysis
- **Auto-Fix Problems:** Automatic detection and fixing of issues
- **Token Management:** Smart context management for long chats
- **Web Search (Pro):** Search the web for up-to-date information
- **Thinking Budget:** Support for reasoning models (o1/o3)
- **Smart Context:** Intelligent file selection for context

---

## Supported AI Providers

NeuroCode supports multiple AI providers out of the box:

| Provider | Models | Type |
|----------|--------|------|
| **OpenAI** | GPT-4, GPT-3.5, o1, o3 | Cloud |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Opus | Cloud |
| **Google** | Gemini Pro, Gemini Ultra | Cloud |
| **Google Vertex AI** | Gemini models | Cloud |
| **Azure OpenAI** | GPT-4, GPT-3.5 | Cloud |
| **Amazon Bedrock** | Claude, Titan | Cloud |
| **XAI** | Grok models | Cloud |
| **OpenRouter** | Multiple models | Cloud |
| **Ollama** | Llama, Mistral, CodeLlama | Local |
| **LM Studio** | Any GGUF model | Local |
| **MiniMax** | MiniMax models | Cloud |

---

## Installation

### Prerequisites

- **Node.js** >= 24
- **npm** or **yarn**
- **Git** (optional, bundled with the app)

### From Source

```bash
# Clone the repository
git clone https://github.com/dyad-sh/dyad.git
cd dyad

# Install dependencies
npm install

# Initialize pre-commit hooks
npm run init-precommit

# Start development
npm run dev
```

### Build Installers

```bash
# Package the application
npm run package

# Create platform-specific installers
npm run make
```

---

## Usage

### Getting Started

1. **Launch NeuroCode** and configure your AI provider API key in Settings
2. **Create a new app** or import an existing project
3. **Start chatting** with the AI to build or modify your application
4. **Preview changes** in real-time in the integrated preview panel

### Chat Modes

#### Build Mode (Default)
Interactive code generation with autonomous tool execution. The AI can read files, write code, and make changes directly to your project.

```
You: "Create a contact form with name, email, and message fields"
AI: [Creates form component, adds validation, styles it]
```

#### Ask Mode
Question-answering mode for understanding your codebase without making changes.

```
You: "How does the authentication flow work?"
AI: [Explains the auth implementation]
```

#### Plan Mode
Collaborative planning interface for complex features. The AI asks clarifying questions and creates detailed implementation plans.

```
You: "I want to add user profiles"
AI: [Asks about requirements, creates detailed plan]
```

#### Local Agent Mode (Pro)
Autonomous agent that can execute multi-step tasks independently with tool calling and decision-making.

```
You: "Refactor the API layer to use TypeScript"
AI: [Analyzes codebase, creates plan, executes refactoring]
```

### Keyboard Shortcuts

- `Ctrl/Cmd + N` - New app
- `Ctrl/Cmd + K` - New chat
- `Ctrl/Cmd + ,` - Settings
- `Ctrl/Cmd + R` - Restart app server
- `Ctrl/Cmd + Shift + R` - Rebuild app

---

## Development

### Project Structure

```
src/
├── main.ts                 # Electron main process
├── preload.ts             # IPC bridge
├── renderer.tsx           # React app entry
├── app/                   # App layout
├── components/            # React components
├── db/                    # Database schema
├── ipc/                   # IPC handlers
├── pages/                 # Page components
├── pro/                   # Pro features
├── prompts/               # AI system prompts
└── routes/                # Router configuration
```

### Tech Stack

- **Frontend:** React 19, TanStack Router, Jotai, Tailwind CSS
- **Backend:** Electron 40, SQLite, Drizzle ORM
- **AI:** Vercel AI SDK with multi-provider support
- **Build:** Vite, Electron Forge
- **Testing:** Vitest, Playwright

### Development Commands

```bash
# Start development server
npm run dev

# Type checking
npm run ts

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run fmt

# Run tests
npm test
npm run e2e

# Database operations
npm run db:generate    # Generate migrations
npm run db:push        # Push schema changes
npm run db:studio      # Open Drizzle Studio
```

### Pre-commit Checks

Before committing, run:

```bash
npm run fmt        # Format code
npm run lint       # Lint code
npm run ts         # Type check
```

Or use the automated skill:

```bash
/dyad:lint
```

---

## Configuration

### User Settings

Settings are stored in `user-settings.json` in the app data directory:

- **Model Selection:** Choose your preferred AI provider and model
- **API Keys:** Securely stored with Electron safe storage
- **Chat Modes:** Configure default and current chat mode
- **Context Management:** Max chat turns, token limits, thinking budget
- **UI Preferences:** Theme, language, zoom level, device mode
- **Integrations:** GitHub, Vercel, Supabase, Neon credentials

### Environment Variables

Create a `.env` file for development:

```env
# AI Provider API Keys
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here

# GitHub Integration
GITHUB_TOKEN=your_token_here

# Local Ollama (optional)
OLLAMA_HOST=http://localhost:11434
```

### MCP Servers

Configure Model Context Protocol servers in `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]
    }
  }
}
```

---

## Testing

### Unit Tests

```bash
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:ui       # UI mode
```

### E2E Tests

```bash
# Build first (required!)
npm run build

# Run E2E tests
npm run e2e
npm run e2e:fast      # With fewer retries
```

**Important:** E2E tests run against the built application. Always rebuild after code changes.

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run pre-commit checks (`npm run fmt && npm run lint && npm run ts`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow the existing code style (enforced by Oxlint and Oxfmt)
- Write tests for new features
- Update documentation as needed

---

## Architecture

### Electron IPC

NeuroCode uses a secure IPC architecture with:

- **Context Isolation:** Enabled for security
- **Typed Contracts:** All IPC endpoints have TypeScript contracts
- **Error Handling:** DyadError with DyadErrorKind for proper classification
- **Handler Categories:** 30+ specialized handler modules

### Database Schema

SQLite database with Drizzle ORM:

- **apps:** Application metadata and integrations
- **chats:** Chat sessions per app
- **messages:** Chat messages with AI responses
- **versions:** Git commit tracking
- **prompts:** Saved prompts and templates
- **language_models:** Available AI models
- **mcp_servers:** MCP server configurations
- **custom_themes:** User-created themes

### State Management

- **Jotai:** Atomic state management for global state
- **TanStack Query:** Server state and data fetching
- **Local State:** Component-level UI state

---

## Security

NeuroCode takes security seriously:

- **Encrypted Storage:** API keys stored with Electron safe storage
- **Input Validation:** Zod schemas for all user input
- **Context Isolation:** Renderer process is sandboxed
- **Security Review:** AI-powered code security analysis
- **Safe Defaults:** Block unsafe npm packages by default

---

## Performance

- **Context Compaction:** Automatic summarization for long chats
- **Token Management:** Smart context limits and counting
- **Lazy Loading:** Components loaded on demand
- **Virtual Scrolling:** Efficient rendering of large lists
- **Performance Monitoring:** Built-in memory and CPU tracking

---

## Troubleshooting

### Common Issues

**App won't start:**
- Check Node.js version (>= 24 required)
- Delete `node_modules` and reinstall: `npm install`
- Check logs in app data directory

**Preview not updating:**
- Click the Refresh button above chat input
- Try Restart or Rebuild commands
- Check browser console for errors

**AI not responding:**
- Verify API key in Settings
- Check internet connection (for cloud providers)
- Try a different model or provider

**Git operations failing:**
- Ensure Git is installed (or use bundled Git)
- Check repository permissions
- Verify GitHub token if using GitHub integration

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- AI powered by [Vercel AI SDK](https://sdk.vercel.ai/)
- UI components from [Base UI](https://base-ui.com/)
- Code editor by [Monaco Editor](https://microsoft.github.io/monaco-editor/)

---

## Support

- **Documentation:** [docs.dyad.sh](https://docs.dyad.sh)
- **Issues:** [GitHub Issues](https://github.com/dyad-sh/dyad/issues)
- **Discussions:** [GitHub Discussions](https://github.com/dyad-sh/dyad/discussions)
- **Help Button:** Use the Help button in the bottom left of the app

---

<div align="center">

Made with ❤️ 

[⬆ Back to Top](#neurocode)

</div>
