# NeuroCode Roadmap

This document outlines the development roadmap for NeuroCode, including completed features, current work, and future plans.

---

## Current Version: 0.44.0-beta.1

---

## ✅ Completed Features

### Core Platform (v0.1 - v0.30)

- [x] **Electron Application Foundation**
  - Desktop app with React frontend
  - Secure IPC communication layer
  - SQLite database with Drizzle ORM
  - Settings management with encrypted storage

- [x] **Multi-Provider AI Integration**
  - OpenAI (GPT-4, GPT-3.5, o1, o3)
  - Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)
  - Google (Gemini Pro, Gemini Ultra)
  - Google Vertex AI
  - Azure OpenAI
  - Amazon Bedrock
  - XAI (Grok)
  - OpenRouter
  - Ollama (local models)
  - LM Studio (local models)
  - MiniMax

- [x] **App Management**
  - Create, import, and manage web applications
  - Custom app folders support
  - App favorites and search
  - App versioning with Git commit tracking

- [x] **Chat Interface**
  - Real-time chat with AI
  - Chat history and search
  - Message approval/rejection workflow
  - Chat summaries

- [x] **Code Editing & Preview**
  - Monaco editor integration
  - Live preview panel with iframe
  - Resizable layout panels
  - Device mode switching (desktop, tablet, mobile)

### Advanced Features (v0.31 - v0.40)

- [x] **Git Integration**
  - Native Git support (Windows-safe)
  - GitHub repository integration
  - Branch management
  - Commit tracking
  - Merge conflict detection

- [x] **Database Integrations**
  - Supabase integration (PostgreSQL + Auth)
  - Neon integration (Serverless PostgreSQL)
  - Schema management
  - Branch-based development databases

- [x] **Deployment**
  - Vercel integration
  - One-click deployment
  - Environment variable management
  - Deployment URL tracking

- [x] **Build Mode**
  - Interactive code generation
  - Autonomous tool execution
  - Real-time code changes
  - Security guidelines

- [x] **Ask Mode**
  - Question-answering about codebase
  - Read-only exploration
  - No autonomous changes

### Recent Features (v0.41 - v0.44)

- [x] **Plan Mode** (v0.42)
  - AI-assisted planning interface
  - Requirements gathering with questionnaires
  - Detailed implementation plans
  - Plan refinement workflow
  - Exit to Build mode for execution

- [x] **Local Agent Mode (Pro)** (v0.43)
  - Autonomous agent with tool execution
  - Parallel tool calling
  - Multi-step task management
  - Outer loop for incomplete tasks
  - Support for reasoning models (o1/o3)

- [x] **Context Compaction** (v0.43)
  - Automatic chat summarization
  - Token management for long conversations
  - Backup creation before compaction
  - Configurable compaction triggers

- [x] **Turbo Edits v2** (v0.44)
  - Smart file editing with search-replace DSL
  - Efficient code modifications
  - Reduced token usage

- [x] **Media Management** (v0.44)
  - Media library for app assets
  - Custom dyad-media:// protocol
  - Media file cleanup and optimization
  - Persistent media serving

- [x] **Image Generation** (v0.44)
  - AI image generation capabilities
  - Integration with image generation APIs
  - Media library integration

- [x] **Theme System** (v0.44)
  - AI-generated themes
  - Custom theme creation
  - Theme preview and management
  - Per-app theme selection

- [x] **MCP Integration** (v0.44)
  - Model Context Protocol support
  - External tool server integration
  - Tool consent management
  - Auto-approval configuration

- [x] **Security Features** (v0.44)
  - AI-powered security review
  - Problem detection and auto-fix
  - Unsafe package blocking
  - Security guidelines in prompts

---

## 🚧 In Progress (v0.45 - v0.50)

### Performance & Optimization

- [ ] **Smart Context Mode Improvements**
  - Enhanced file selection algorithms
  - Better context relevance scoring
  - Reduced token usage without losing quality
  - Configurable context strategies (balanced, conservative, deep)

- [ ] **Token Optimization**
  - More aggressive context pruning
  - Smarter message history management
  - Dynamic token allocation per provider
  - Cost tracking and budgeting

- [ ] **Performance Monitoring**
  - Enhanced memory usage tracking
  - CPU usage optimization
  - Startup time improvements
  - Preview rendering optimization

### User Experience

- [ ] **Onboarding Flow**
  - First-time user tutorial
  - Interactive feature discovery
  - Sample projects and templates
  - Quick start guides

- [ ] **Improved Error Handling**
  - Better error messages
  - Recovery suggestions
  - Error reporting improvements
  - Diagnostic tools

- [ ] **UI/UX Refinements**
  - Keyboard shortcuts customization
  - Command palette enhancements
  - Better mobile device preview
  - Accessibility improvements

### Developer Experience

- [ ] **Enhanced Debugging**
  - Better error stack traces
  - Debug mode for AI responses
  - Tool execution logging
  - Performance profiling

- [ ] **Testing Improvements**
  - More E2E test coverage
  - Visual regression testing
  - Performance benchmarks
  - Flaky test detection

---

## 🔮 Planned Features (v0.51+)

### Q2 2026: Collaboration & Sharing

- [ ] **Team Collaboration**
  - Multi-user support
  - Real-time collaboration on apps
  - Shared chat history
  - Team settings and permissions

- [ ] **App Sharing**
  - Export/import app configurations
  - Share apps with other users
  - App marketplace/gallery
  - Template sharing

- [ ] **Cloud Sync (Optional)**
  - Sync settings across devices
  - Cloud backup of apps and chats
  - Cross-device chat history
  - End-to-end encryption

### Q3 2026: Advanced AI Features

- [ ] **Multi-Agent Workflows**
  - Specialized agents for different tasks
  - Agent orchestration
  - Agent-to-agent communication
  - Custom agent creation

- [ ] **Visual Editing Mode**
  - Drag-and-drop component editing
  - Visual style editor
  - Layout builder
  - Component library browser

- [ ] **Code Review Agent**
  - Automated code review
  - Best practices suggestions
  - Performance optimization hints
  - Security vulnerability detection

- [ ] **Testing Agent**
  - Automated test generation
  - Test coverage analysis
  - E2E test creation
  - Test maintenance

### Q4 2026: Enterprise Features

- [ ] **Self-Hosted AI Models**
  - Support for more local models
  - Model fine-tuning interface
  - Custom model training
  - Model performance comparison

- [ ] **Advanced Security**
  - Role-based access control
  - Audit logging
  - Compliance reporting
  - Data retention policies

- [ ] **Enterprise Integrations**
  - JIRA integration
  - Slack/Teams notifications
  - CI/CD pipeline integration
  - Custom webhook support

- [ ] **Analytics & Insights**
  - Usage analytics dashboard
  - AI performance metrics
  - Cost tracking and optimization
  - Team productivity insights

### 2027: Platform Expansion

- [ ] **Mobile App**
  - iOS and Android apps
  - Mobile-optimized UI
  - Sync with desktop app
  - Push notifications

- [ ] **Web Version**
  - Browser-based version
  - Progressive Web App (PWA)
  - Cloud-hosted option
  - Offline support

- [ ] **Plugin System**
  - Third-party plugin support
  - Plugin marketplace
  - Custom tool creation
  - Extension API

- [ ] **Language Support**
  - More programming languages
  - Framework-specific templates
  - Language-specific AI prompts
  - Multi-language documentation

---

## 🎯 Long-Term Vision

### Developer Productivity

- **AI Pair Programming:** Real-time AI assistance while coding
- **Intelligent Code Completion:** Context-aware suggestions
- **Automated Refactoring:** AI-powered code improvements
- **Documentation Generation:** Automatic docs from code

### Platform Ecosystem

- **Marketplace:** Templates, themes, plugins, and agents
- **Community:** Forums, tutorials, and shared knowledge
- **Education:** Learning resources and courses
- **Certification:** Developer certification program

### AI Capabilities

- **Multi-Modal AI:** Support for vision, audio, and video
- **Custom Model Training:** Fine-tune models on your codebase
- **Federated Learning:** Learn from community without sharing code
- **Explainable AI:** Understand AI decision-making

### Integration Ecosystem

- **More Cloud Providers:** AWS, GCP, DigitalOcean, etc.
- **More Databases:** MongoDB, PostgreSQL, MySQL, Redis, etc.
- **More Frameworks:** Next.js, Nuxt, SvelteKit, Astro, etc.
- **More Tools:** Docker, Kubernetes, Terraform, etc.

---

## 📊 Feature Prioritization

Features are prioritized based on:

1. **User Impact:** How many users will benefit?
2. **Development Effort:** How complex is the implementation?
3. **Strategic Value:** Does it align with long-term vision?
4. **Community Feedback:** What are users requesting?
5. **Technical Debt:** Does it improve code quality?

---

## 🤝 Community Involvement

We welcome community contributions! Here's how you can help:

### Feature Requests

- Open an issue with the `feature-request` label
- Describe the use case and expected behavior
- Provide examples or mockups if possible
- Vote on existing feature requests

### Bug Reports

- Open an issue with the `bug` label
- Include steps to reproduce
- Provide system information
- Attach logs or screenshots

### Pull Requests

- Check the roadmap for planned features
- Discuss major changes in an issue first
- Follow the contribution guidelines
- Write tests for new features

### Documentation

- Improve existing documentation
- Write tutorials and guides
- Translate documentation
- Create video tutorials

---

## 📅 Release Schedule

### Beta Releases

- **Frequency:** Every 2-3 weeks
- **Focus:** New features and improvements
- **Stability:** May have bugs, use with caution
- **Channel:** `beta` in settings

### Stable Releases

- **Frequency:** Every 4-6 weeks
- **Focus:** Bug fixes and stability
- **Stability:** Production-ready
- **Channel:** `stable` in settings (default)

### Hotfix Releases

- **Frequency:** As needed
- **Focus:** Critical bug fixes
- **Stability:** Minimal changes, high priority
- **Channel:** Both `beta` and `stable`

---

## 🔄 Version History

### v0.44.0-beta.1 (Current)
- Media management system
- Image generation capabilities
- Theme system improvements
- MCP integration enhancements

### v0.43.0
- Local Agent Mode (Pro)
- Context compaction
- Turbo Edits v2
- Performance improvements

### v0.42.0
- Plan Mode
- Requirements gathering
- Implementation planning
- Plan refinement workflow

### v0.41.0
- Security review features
- Problem detection
- Auto-fix capabilities
- Enhanced error handling

### v0.40.0
- Vercel integration
- Deployment management
- Environment variables
- Production builds

---

## 📝 Notes

- This roadmap is subject to change based on user feedback and technical constraints
- Dates are estimates and may shift based on development progress
- Pro features are marked with (Pro) and require a Dyad Pro subscription
- Community contributions may accelerate feature development

---

## 🙏 Feedback

We value your feedback! Please share your thoughts:

- **GitHub Issues:** [Report bugs or request features](https://github.com/dyad-sh/dyad/issues)
- **GitHub Discussions:** [Join the conversation](https://github.com/dyad-sh/dyad/discussions)
- **Help Button:** Use the in-app Help button for direct feedback
- **Email:** willchen90@gmail.com

---

<div align="center">

**Last Updated:** April 2026

[⬆ Back to Top](#neurocode-roadmap)

</div>
