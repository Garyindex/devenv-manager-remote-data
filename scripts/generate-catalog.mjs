import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const categories = {
  'source-control': 'Source control',
  editor: 'Editors and IDEs',
  terminal: 'Terminals and shell productivity',
  javascript: 'JavaScript and TypeScript',
  python: 'Python',
  rust: 'Rust',
  go: 'Go',
  java: 'Java and JVM',
  dotnet: '.NET',
  cpp: 'C, C++, and native build tools',
  container: 'Containers and Kubernetes',
  devops: 'DevOps and infrastructure',
  cloud: 'Cloud CLIs',
  api: 'API development and testing',
  database: 'Databases and database clients',
  mobile: 'Mobile development',
  security: 'Security and network diagnostics',
  data: 'Data science and analytics',
  web: 'Web platforms and SaaS CLIs',
  php: 'PHP',
  ruby: 'Ruby',
  functional: 'Functional and BEAM languages',
  game: 'Game and 3D development',
  docs: 'Documentation and content tooling'
}

const suites = [
  { id: 'core', name: 'Core developer workstation', toolIds: ['git', 'github_cli', 'vscode', 'windows_terminal', 'powershell', 'ripgrep', 'fd', 'jq'] },
  { id: 'frontend', name: 'Frontend and web apps', toolIds: ['node_lts', 'npm', 'pnpm', 'yarn', 'bun', 'deno', 'volta', 'vscode'] },
  { id: 'python', name: 'Python development', toolIds: ['python_312', 'uv', 'pipx', 'poetry', 'miniconda', 'pycharm_community'] },
  { id: 'native', name: 'Native and desktop builds', toolIds: ['rustup', 'go', 'cmake', 'ninja', 'llvm', 'vs_build_tools', 'msys2'] },
  { id: 'java', name: 'Java and JVM development', toolIds: ['temurin_21', 'temurin_17', 'maven', 'gradle', 'scala', 'sbt', 'clojure'] },
  { id: 'container', name: 'Container and Kubernetes', toolIds: ['docker_desktop', 'podman', 'rancher_desktop', 'kubectl', 'helm', 'minikube', 'kind'] },
  { id: 'cloud', name: 'Cloud and deployment', toolIds: ['aws_cli', 'azure_cli', 'google_cloud_sdk', 'terraform', 'opentofu', 'pulumi', 'vercel_cli', 'netlify_cli', 'cloudflared'] },
  { id: 'database', name: 'Database workbench', toolIds: ['postgresql', 'pgadmin', 'mysql', 'mysql_workbench', 'mongodb_compass', 'redis', 'sqlite_browser', 'dbeaver', 'beekeeper_studio'] },
  { id: 'mobile', name: 'Mobile development', toolIds: ['android_studio', 'android_platform_tools', 'flutter', 'dart', 'temurin_21'] },
  { id: 'security', name: 'Security and diagnostics', toolIds: ['wireshark', 'mitmproxy', 'sysinternals_suite', 'process_explorer', 'sysmon', 'nmap'] }
]

function tool({
  id,
  name,
  category,
  wingetId = '',
  commands = [],
  homepage = null,
  downloadPage = null,
  releasePage = null,
  source = 'winget',
  required = false,
  needsAdmin = false,
  notes = '',
  aliases = [],
  platforms = ['windows'],
  tags = []
}) {
  const sources = []
  if (homepage || downloadPage || releasePage) {
    sources.push({
      id: 'official-download',
      manager: 'official-download',
      packageId: null,
      platforms,
      official: true,
      priority: 100,
      links: {
        homepage,
        download: downloadPage ?? homepage,
        releases: releasePage
      },
      capabilities: {
        versionHistory: false,
        directDownload: false,
        installCommand: false
      }
    })
  }
  if (wingetId) {
    sources.push({
      id: 'winget',
      manager: 'winget',
      packageId: wingetId,
      platforms: ['windows'],
      official: true,
      priority: 10,
      links: {
        homepage,
        download: downloadPage ?? homepage,
        releases: releasePage
      },
      capabilities: {
        versionHistory: true,
        directDownload: true,
        installCommand: true,
        updateCommand: true,
        uninstallCommand: true
      }
    })
  }
  return {
    id,
    name,
    categoryId: category,
    summary: notes,
    description: null,
    aliases,
    tags,
    platforms,
    links: {
      homepage,
      download: downloadPage ?? homepage,
      releases: releasePage,
      docs: null
    },
    detection: {
      commands
    },
    sources,
    requirements: {
      required,
      requiresAdmin: needsAdmin,
      dependencies: []
    },
    lifecycle: {
      status: 'active',
      deprecated: false,
      replacedBy: null
    }
  }
}

const tools = [
  tool({ id: 'git', name: 'Git', category: 'source-control', wingetId: 'Git.Git', commands: [{ command: 'git', versionArg: '--version' }], homepage: 'https://git-scm.com/', tags: ['vcs'] }),
  tool({ id: 'github_cli', name: 'GitHub CLI', category: 'source-control', wingetId: 'GitHub.cli', commands: [{ command: 'gh', versionArg: '--version' }], homepage: 'https://cli.github.com/', tags: ['github', 'vcs'] }),
  tool({ id: 'git_lfs', name: 'Git LFS', category: 'source-control', wingetId: 'GitHub.GitLFS', commands: [{ command: 'git-lfs', versionArg: '--version' }], homepage: 'https://git-lfs.com/' }),
  tool({ id: 'github_desktop', name: 'GitHub Desktop', category: 'source-control', wingetId: 'GitHub.GitHubDesktop', homepage: 'https://desktop.github.com/' }),
  tool({ id: 'git_extensions', name: 'Git Extensions', category: 'source-control', wingetId: 'GitExtensionsTeam.GitExtensions', homepage: 'https://gitextensions.github.io/' }),
  tool({ id: 'tortoisegit', name: 'TortoiseGit', category: 'source-control', wingetId: 'TortoiseGit.TortoiseGit', homepage: 'https://tortoisegit.org/' }),

  tool({ id: 'vscode', name: 'Visual Studio Code', category: 'editor', wingetId: 'Microsoft.VisualStudioCode', commands: [{ command: 'code', versionArg: '--version' }], homepage: 'https://code.visualstudio.com/' }),
  tool({ id: 'vscodium', name: 'VSCodium', category: 'editor', wingetId: 'VSCodium.VSCodium', commands: [{ command: 'codium', versionArg: '--version' }], homepage: 'https://vscodium.com/' }),
  tool({ id: 'jetbrains_toolbox', name: 'JetBrains Toolbox', category: 'editor', wingetId: 'JetBrains.Toolbox', homepage: 'https://www.jetbrains.com/toolbox-app/' }),
  tool({ id: 'pycharm_community', name: 'PyCharm Community', category: 'editor', wingetId: 'JetBrains.PyCharm.Community', homepage: 'https://www.jetbrains.com/pycharm/' }),
  tool({ id: 'intellij_idea_community', name: 'IntelliJ IDEA Community', category: 'editor', wingetId: 'JetBrains.IntelliJIDEA.Community', homepage: 'https://www.jetbrains.com/idea/' }),
  tool({ id: 'sublime_text', name: 'Sublime Text', category: 'editor', wingetId: 'SublimeHQ.SublimeText.4', commands: [{ command: 'subl', versionArg: '--version' }], homepage: 'https://www.sublimetext.com/' }),
  tool({ id: 'notepad_plus_plus', name: 'Notepad++', category: 'editor', wingetId: 'Notepad++.Notepad++', homepage: 'https://notepad-plus-plus.org/' }),
  tool({ id: 'neovim', name: 'Neovim', category: 'editor', wingetId: 'Neovim.Neovim', commands: [{ command: 'nvim', versionArg: '--version' }], homepage: 'https://neovim.io/' }),
  tool({ id: 'vim', name: 'Vim', category: 'editor', wingetId: 'vim.vim', commands: [{ command: 'vim', versionArg: '--version' }], homepage: 'https://www.vim.org/' }),
  tool({ id: 'emacs', name: 'GNU Emacs', category: 'editor', wingetId: 'GNU.Emacs', commands: [{ command: 'emacs', versionArg: '--version' }], homepage: 'https://www.gnu.org/software/emacs/' }),

  tool({ id: 'windows_terminal', name: 'Windows Terminal', category: 'terminal', wingetId: 'Microsoft.WindowsTerminal', commands: [{ command: 'wt', versionArg: '--version' }], homepage: 'https://github.com/microsoft/terminal' }),
  tool({ id: 'powershell', name: 'PowerShell 7', category: 'terminal', wingetId: 'Microsoft.PowerShell', commands: [{ command: 'pwsh', versionArg: '--version' }], homepage: 'https://github.com/PowerShell/PowerShell' }),
  tool({ id: 'oh_my_posh', name: 'Oh My Posh', category: 'terminal', wingetId: 'JanDeDobbeleer.OhMyPosh', commands: [{ command: 'oh-my-posh', versionArg: 'version' }], homepage: 'https://ohmyposh.dev/' }),
  tool({ id: 'starship', name: 'Starship', category: 'terminal', wingetId: 'Starship.Starship', commands: [{ command: 'starship', versionArg: '--version' }], homepage: 'https://starship.rs/' }),
  tool({ id: 'ripgrep', name: 'ripgrep', category: 'terminal', wingetId: 'BurntSushi.ripgrep.MSVC', commands: [{ command: 'rg', versionArg: '--version' }], homepage: 'https://github.com/BurntSushi/ripgrep' }),
  tool({ id: 'fd', name: 'fd', category: 'terminal', wingetId: 'sharkdp.fd', commands: [{ command: 'fd', versionArg: '--version' }], homepage: 'https://github.com/sharkdp/fd' }),
  tool({ id: 'bat', name: 'bat', category: 'terminal', wingetId: 'sharkdp.bat', commands: [{ command: 'bat', versionArg: '--version' }], homepage: 'https://github.com/sharkdp/bat' }),
  tool({ id: 'fzf', name: 'fzf', category: 'terminal', wingetId: 'junegunn.fzf', commands: [{ command: 'fzf', versionArg: '--version' }], homepage: 'https://github.com/junegunn/fzf' }),
  tool({ id: 'jq', name: 'jq', category: 'terminal', wingetId: 'jqlang.jq', commands: [{ command: 'jq', versionArg: '--version' }], homepage: 'https://jqlang.github.io/jq/' }),
  tool({ id: 'zoxide', name: 'zoxide', category: 'terminal', wingetId: 'ajeetdsouza.zoxide', commands: [{ command: 'zoxide', versionArg: '--version' }], homepage: 'https://github.com/ajeetdsouza/zoxide' }),

  tool({ id: 'node_lts', name: 'Node.js LTS', category: 'javascript', wingetId: 'OpenJS.NodeJS.LTS', commands: [{ command: 'node', versionArg: '--version' }], homepage: 'https://nodejs.org/' }),
  tool({ id: 'node_current', name: 'Node.js Current', category: 'javascript', wingetId: 'OpenJS.NodeJS', commands: [{ command: 'node', versionArg: '--version' }], homepage: 'https://nodejs.org/' }),
  tool({ id: 'npm', name: 'npm', category: 'javascript', wingetId: 'OpenJS.NodeJS.LTS', commands: [{ command: 'npm', versionArg: '--version' }], homepage: 'https://www.npmjs.com/' }),
  tool({ id: 'pnpm', name: 'pnpm', category: 'javascript', wingetId: 'pnpm.pnpm', commands: [{ command: 'pnpm', versionArg: '--version' }], homepage: 'https://pnpm.io/' }),
  tool({ id: 'yarn', name: 'Yarn', category: 'javascript', wingetId: 'Yarn.Yarn', commands: [{ command: 'yarn', versionArg: '--version' }], homepage: 'https://yarnpkg.com/' }),
  tool({ id: 'bun', name: 'Bun', category: 'javascript', wingetId: 'Oven-sh.Bun', commands: [{ command: 'bun', versionArg: '--version' }], homepage: 'https://bun.sh/' }),
  tool({ id: 'deno', name: 'Deno', category: 'javascript', wingetId: 'DenoLand.Deno', commands: [{ command: 'deno', versionArg: '--version' }], homepage: 'https://deno.com/' }),
  tool({ id: 'volta', name: 'Volta', category: 'javascript', wingetId: 'Volta.Volta', commands: [{ command: 'volta', versionArg: '--version' }], homepage: 'https://volta.sh/' }),
  tool({ id: 'nvm_windows', name: 'nvm-windows', category: 'javascript', wingetId: 'CoreyButler.NVMforWindows', commands: [{ command: 'nvm', versionArg: 'version' }], homepage: 'https://github.com/coreybutler/nvm-windows' }),

  tool({ id: 'python_312', name: 'Python 3.12', category: 'python', wingetId: 'Python.Python.3.12', commands: [{ command: 'python', versionArg: '--version' }, { command: 'py', versionArg: '--version' }], homepage: 'https://www.python.org/' }),
  tool({ id: 'python_311', name: 'Python 3.11', category: 'python', wingetId: 'Python.Python.3.11', commands: [{ command: 'python', versionArg: '--version' }, { command: 'py', versionArg: '--version' }], homepage: 'https://www.python.org/' }),
  tool({ id: 'uv', name: 'uv', category: 'python', wingetId: 'astral-sh.uv', commands: [{ command: 'uv', versionArg: '--version' }], homepage: 'https://docs.astral.sh/uv/' }),
  tool({ id: 'pipx', name: 'pipx', category: 'python', wingetId: 'pypa.pipx', commands: [{ command: 'pipx', versionArg: '--version' }], homepage: 'https://pipx.pypa.io/' }),
  tool({ id: 'poetry', name: 'Poetry', category: 'python', wingetId: 'Python.Poetry', commands: [{ command: 'poetry', versionArg: '--version' }], homepage: 'https://python-poetry.org/' }),
  tool({ id: 'miniconda', name: 'Miniconda', category: 'python', wingetId: 'Anaconda.Miniconda3', commands: [{ command: 'conda', versionArg: '--version' }], homepage: 'https://docs.conda.io/projects/miniconda/' }),
  tool({ id: 'anaconda', name: 'Anaconda', category: 'python', wingetId: 'Anaconda.Anaconda3', commands: [{ command: 'conda', versionArg: '--version' }], homepage: 'https://www.anaconda.com/' }),

  tool({ id: 'rustup', name: 'Rustup', category: 'rust', wingetId: 'Rustlang.Rustup', commands: [{ command: 'rustup', versionArg: '--version' }, { command: 'rustc', versionArg: '--version' }], homepage: 'https://rustup.rs/' }),
  tool({ id: 'rust_msvc', name: 'Rust MSVC', category: 'rust', wingetId: 'Rustlang.Rust.MSVC', commands: [{ command: 'rustc', versionArg: '--version' }], homepage: 'https://www.rust-lang.org/' }),
  tool({ id: 'cargo', name: 'Cargo', category: 'rust', wingetId: 'Rustlang.Rustup', commands: [{ command: 'cargo', versionArg: '--version' }], homepage: 'https://doc.rust-lang.org/cargo/' }),

  tool({ id: 'go', name: 'Go', category: 'go', wingetId: 'GoLang.Go', commands: [{ command: 'go', versionArg: 'version' }], homepage: 'https://go.dev/' }),
  tool({ id: 'tinygo', name: 'TinyGo', category: 'go', wingetId: 'TinyGo.TinyGo', commands: [{ command: 'tinygo', versionArg: 'version' }], homepage: 'https://tinygo.org/' }),

  tool({ id: 'dotnet_9', name: '.NET SDK 9', category: 'dotnet', wingetId: 'Microsoft.DotNet.SDK.9', commands: [{ command: 'dotnet', versionArg: '--version' }], homepage: 'https://dotnet.microsoft.com/' }),
  tool({ id: 'dotnet_8', name: '.NET SDK 8', category: 'dotnet', wingetId: 'Microsoft.DotNet.SDK.8', commands: [{ command: 'dotnet', versionArg: '--version' }], homepage: 'https://dotnet.microsoft.com/' }),

  tool({ id: 'temurin_21', name: 'Eclipse Temurin JDK 21', category: 'java', wingetId: 'EclipseAdoptium.Temurin.21.JDK', commands: [{ command: 'java', versionArg: '--version' }, { command: 'javac', versionArg: '--version' }], homepage: 'https://adoptium.net/' }),
  tool({ id: 'temurin_17', name: 'Eclipse Temurin JDK 17', category: 'java', wingetId: 'EclipseAdoptium.Temurin.17.JDK', commands: [{ command: 'java', versionArg: '--version' }, { command: 'javac', versionArg: '--version' }], homepage: 'https://adoptium.net/' }),
  tool({ id: 'oracle_jdk_21', name: 'Oracle JDK 21', category: 'java', wingetId: 'Oracle.JDK.21', commands: [{ command: 'java', versionArg: '--version' }], homepage: 'https://www.oracle.com/java/' }),
  tool({ id: 'maven', name: 'Apache Maven', category: 'java', wingetId: 'Apache.Maven', commands: [{ command: 'mvn', versionArg: '--version' }], homepage: 'https://maven.apache.org/' }),
  tool({ id: 'gradle', name: 'Gradle', category: 'java', wingetId: 'Gradle.Gradle', commands: [{ command: 'gradle', versionArg: '--version' }], homepage: 'https://gradle.org/' }),
  tool({ id: 'scala', name: 'Scala', category: 'java', wingetId: 'Scala.Scala', commands: [{ command: 'scala', versionArg: '-version' }], homepage: 'https://www.scala-lang.org/' }),
  tool({ id: 'sbt', name: 'sbt', category: 'java', wingetId: 'sbt.sbt', commands: [{ command: 'sbt', versionArg: '--version' }], homepage: 'https://www.scala-sbt.org/' }),
  tool({ id: 'clojure', name: 'Clojure CLI', category: 'java', wingetId: 'Clojure.ClojureCLI', commands: [{ command: 'clojure', versionArg: '--version' }], homepage: 'https://clojure.org/' }),

  tool({ id: 'cmake', name: 'CMake', category: 'cpp', wingetId: 'Kitware.CMake', commands: [{ command: 'cmake', versionArg: '--version' }], homepage: 'https://cmake.org/' }),
  tool({ id: 'ninja', name: 'Ninja', category: 'cpp', wingetId: 'Ninja-build.Ninja', commands: [{ command: 'ninja', versionArg: '--version' }], homepage: 'https://ninja-build.org/' }),
  tool({ id: 'llvm', name: 'LLVM', category: 'cpp', wingetId: 'LLVM.LLVM', commands: [{ command: 'clang', versionArg: '--version' }], homepage: 'https://llvm.org/' }),
  tool({ id: 'vs_build_tools', name: 'Visual Studio Build Tools', category: 'cpp', wingetId: 'Microsoft.VisualStudio.2022.BuildTools', homepage: 'https://visualstudio.microsoft.com/visual-cpp-build-tools/', needsAdmin: true }),
  tool({ id: 'visual_studio_community', name: 'Visual Studio Community', category: 'cpp', wingetId: 'Microsoft.VisualStudio.2022.Community', commands: [{ command: 'devenv', versionArg: '/?' }], homepage: 'https://visualstudio.microsoft.com/', needsAdmin: true }),
  tool({ id: 'msys2', name: 'MSYS2', category: 'cpp', wingetId: 'MSYS2.MSYS2', commands: [{ command: 'pacman', versionArg: '--version' }], homepage: 'https://www.msys2.org/' }),

  tool({ id: 'docker_desktop', name: 'Docker Desktop', category: 'container', wingetId: 'Docker.DockerDesktop', commands: [{ command: 'docker', versionArg: '--version' }], homepage: 'https://www.docker.com/products/docker-desktop/', needsAdmin: true }),
  tool({ id: 'podman', name: 'Podman', category: 'container', wingetId: 'RedHat.Podman', commands: [{ command: 'podman', versionArg: '--version' }], homepage: 'https://podman.io/' }),
  tool({ id: 'rancher_desktop', name: 'Rancher Desktop', category: 'container', wingetId: 'SUSE.RancherDesktop', homepage: 'https://rancherdesktop.io/' }),
  tool({ id: 'kubectl', name: 'kubectl', category: 'container', wingetId: 'Kubernetes.kubectl', commands: [{ command: 'kubectl', versionArg: 'version' }], homepage: 'https://kubernetes.io/docs/reference/kubectl/' }),
  tool({ id: 'helm', name: 'Helm', category: 'container', wingetId: 'Helm.Helm', commands: [{ command: 'helm', versionArg: 'version' }], homepage: 'https://helm.sh/' }),
  tool({ id: 'minikube', name: 'minikube', category: 'container', wingetId: 'Kubernetes.minikube', commands: [{ command: 'minikube', versionArg: 'version' }], homepage: 'https://minikube.sigs.k8s.io/' }),
  tool({ id: 'kind', name: 'kind', category: 'container', wingetId: 'Kubernetes.kind', commands: [{ command: 'kind', versionArg: 'version' }], homepage: 'https://kind.sigs.k8s.io/' }),
  tool({ id: 'ddev', name: 'DDEV', category: 'container', wingetId: 'DDEV.DDEV', commands: [{ command: 'ddev', versionArg: 'version' }], homepage: 'https://ddev.com/' }),

  tool({ id: 'terraform', name: 'Terraform', category: 'devops', wingetId: 'Hashicorp.Terraform', commands: [{ command: 'terraform', versionArg: '--version' }], homepage: 'https://www.terraform.io/' }),
  tool({ id: 'opentofu', name: 'OpenTofu', category: 'devops', wingetId: 'OpenTofu.Tofu', commands: [{ command: 'tofu', versionArg: '--version' }], homepage: 'https://opentofu.org/' }),
  tool({ id: 'packer', name: 'Packer', category: 'devops', wingetId: 'Hashicorp.Packer', commands: [{ command: 'packer', versionArg: '--version' }], homepage: 'https://www.packer.io/' }),
  tool({ id: 'vagrant', name: 'Vagrant', category: 'devops', wingetId: 'Hashicorp.Vagrant', commands: [{ command: 'vagrant', versionArg: '--version' }], homepage: 'https://www.vagrantup.com/' }),
  tool({ id: 'pulumi', name: 'Pulumi', category: 'devops', wingetId: 'Pulumi.Pulumi', commands: [{ command: 'pulumi', versionArg: 'version' }], homepage: 'https://www.pulumi.com/' }),
  tool({ id: 'ansible', name: 'Ansible', category: 'devops', wingetId: 'Ansible.Ansible', commands: [{ command: 'ansible', versionArg: '--version' }], homepage: 'https://www.ansible.com/' }),

  tool({ id: 'aws_cli', name: 'AWS CLI', category: 'cloud', wingetId: 'Amazon.AWSCLI', commands: [{ command: 'aws', versionArg: '--version' }], homepage: 'https://aws.amazon.com/cli/' }),
  tool({ id: 'azure_cli', name: 'Azure CLI', category: 'cloud', wingetId: 'Microsoft.AzureCLI', commands: [{ command: 'az', versionArg: '--version' }], homepage: 'https://learn.microsoft.com/cli/azure/' }),
  tool({ id: 'google_cloud_sdk', name: 'Google Cloud SDK', category: 'cloud', wingetId: 'Google.CloudSDK', commands: [{ command: 'gcloud', versionArg: '--version' }], homepage: 'https://cloud.google.com/sdk' }),
  tool({ id: 'cloudflared', name: 'cloudflared', category: 'cloud', wingetId: 'Cloudflare.cloudflared', commands: [{ command: 'cloudflared', versionArg: '--version' }], homepage: 'https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/' }),
  tool({ id: 'wrangler', name: 'Wrangler', category: 'cloud', wingetId: 'Cloudflare.Wrangler', commands: [{ command: 'wrangler', versionArg: '--version' }], homepage: 'https://developers.cloudflare.com/workers/wrangler/' }),
  tool({ id: 'doppler', name: 'Doppler CLI', category: 'cloud', wingetId: 'Doppler.Doppler', commands: [{ command: 'doppler', versionArg: '--version' }], homepage: 'https://www.doppler.com/' }),

  tool({ id: 'postman', name: 'Postman', category: 'api', wingetId: 'Postman.Postman', homepage: 'https://www.postman.com/' }),
  tool({ id: 'insomnia', name: 'Insomnia', category: 'api', wingetId: 'Kong.Insomnia', homepage: 'https://insomnia.rest/' }),
  tool({ id: 'bruno', name: 'Bruno', category: 'api', wingetId: 'Bruno.Bruno', homepage: 'https://www.usebruno.com/' }),
  tool({ id: 'httpie', name: 'HTTPie', category: 'api', wingetId: 'HTTPie.HTTPie', commands: [{ command: 'http', versionArg: '--version' }], homepage: 'https://httpie.io/' }),
  tool({ id: 'graphql_playground', name: 'GraphQL Playground', category: 'api', wingetId: 'GraphQL.GraphQLPlayground', homepage: 'https://github.com/graphql/graphql-playground' }),
  tool({ id: 'graphiql', name: 'GraphiQL', category: 'api', wingetId: 'GraphQL.GraphiQL', homepage: 'https://github.com/graphql/graphiql' }),

  tool({ id: 'postgresql', name: 'PostgreSQL', category: 'database', wingetId: 'PostgreSQL.PostgreSQL', commands: [{ command: 'psql', versionArg: '--version' }], homepage: 'https://www.postgresql.org/' }),
  tool({ id: 'pgadmin', name: 'pgAdmin', category: 'database', wingetId: 'PostgreSQL.pgAdmin', homepage: 'https://www.pgadmin.org/' }),
  tool({ id: 'mysql', name: 'MySQL', category: 'database', wingetId: 'Oracle.MySQL', commands: [{ command: 'mysql', versionArg: '--version' }], homepage: 'https://www.mysql.com/' }),
  tool({ id: 'mysql_workbench', name: 'MySQL Workbench', category: 'database', wingetId: 'Oracle.MySQLWorkbench', homepage: 'https://www.mysql.com/products/workbench/' }),
  tool({ id: 'mariadb', name: 'MariaDB', category: 'database', wingetId: 'MariaDB.Server', commands: [{ command: 'mariadb', versionArg: '--version' }], homepage: 'https://mariadb.org/' }),
  tool({ id: 'mongodb_compass', name: 'MongoDB Compass', category: 'database', wingetId: 'MongoDB.Compass.Full', homepage: 'https://www.mongodb.com/products/tools/compass' }),
  tool({ id: 'redis', name: 'Redis', category: 'database', wingetId: 'Redis.Redis', commands: [{ command: 'redis-server', versionArg: '--version' }], homepage: 'https://redis.io/' }),
  tool({ id: 'sqlite_browser', name: 'DB Browser for SQLite', category: 'database', wingetId: 'DBBrowserForSQLite.DBBrowserForSQLite', homepage: 'https://sqlitebrowser.org/' }),
  tool({ id: 'dbeaver', name: 'DBeaver Community', category: 'database', wingetId: 'DBeaver.DBeaver.Community', homepage: 'https://dbeaver.io/' }),
  tool({ id: 'beekeeper_studio', name: 'Beekeeper Studio', category: 'database', wingetId: 'beekeeper-studio.beekeeper-studio', homepage: 'https://www.beekeeperstudio.io/' }),

  tool({ id: 'android_studio', name: 'Android Studio', category: 'mobile', wingetId: 'Google.AndroidStudio', commands: [{ command: 'studio64', versionArg: '--version' }, { command: 'studio', versionArg: '--version' }], homepage: 'https://developer.android.com/studio', needsAdmin: true }),
  tool({ id: 'android_platform_tools', name: 'Android SDK Platform-Tools', category: 'mobile', wingetId: 'Google.PlatformTools', commands: [{ command: 'adb', versionArg: 'version' }], homepage: 'https://developer.android.com/tools/releases/platform-tools' }),
  tool({ id: 'flutter', name: 'Flutter', category: 'mobile', wingetId: 'Flutter.Flutter', commands: [{ command: 'flutter', versionArg: '--version' }], homepage: 'https://flutter.dev/' }),
  tool({ id: 'dart', name: 'Dart SDK', category: 'mobile', wingetId: 'DartSDK.DartSDK', commands: [{ command: 'dart', versionArg: '--version' }], homepage: 'https://dart.dev/' }),

  tool({ id: 'wireshark', name: 'Wireshark', category: 'security', wingetId: 'WiresharkFoundation.Wireshark', homepage: 'https://www.wireshark.org/' }),
  tool({ id: 'mitmproxy', name: 'mitmproxy', category: 'security', wingetId: 'mitmproxy.mitmproxy', commands: [{ command: 'mitmproxy', versionArg: '--version' }], homepage: 'https://mitmproxy.org/' }),
  tool({ id: 'nmap', name: 'Nmap', category: 'security', wingetId: 'Insecure.Nmap', commands: [{ command: 'nmap', versionArg: '--version' }], homepage: 'https://nmap.org/' }),
  tool({ id: 'sysinternals_suite', name: 'Sysinternals Suite', category: 'security', wingetId: 'Microsoft.Sysinternals.Suite', homepage: 'https://learn.microsoft.com/sysinternals/' }),
  tool({ id: 'process_explorer', name: 'Process Explorer', category: 'security', wingetId: 'Microsoft.Sysinternals.ProcessExplorer', homepage: 'https://learn.microsoft.com/sysinternals/downloads/process-explorer' }),
  tool({ id: 'sysmon', name: 'Sysmon', category: 'security', wingetId: 'Microsoft.Sysinternals.Sysmon', homepage: 'https://learn.microsoft.com/sysinternals/downloads/sysmon' }),

  tool({ id: 'r', name: 'R', category: 'data', wingetId: 'RProject.R', commands: [{ command: 'R', versionArg: '--version' }], homepage: 'https://www.r-project.org/' }),
  tool({ id: 'rstudio', name: 'RStudio Desktop', category: 'data', wingetId: 'Posit.RStudio', homepage: 'https://posit.co/products/open-source/rstudio/' }),
  tool({ id: 'julia', name: 'Julia', category: 'data', wingetId: 'Julialang.Julia', commands: [{ command: 'julia', versionArg: '--version' }], homepage: 'https://julialang.org/' }),
  tool({ id: 'quarto', name: 'Quarto', category: 'data', wingetId: 'Posit.Quarto', commands: [{ command: 'quarto', versionArg: '--version' }], homepage: 'https://quarto.org/' }),

  tool({ id: 'vercel_cli', name: 'Vercel CLI', category: 'web', wingetId: 'Vercel.VercelCLI', commands: [{ command: 'vercel', versionArg: '--version' }], homepage: 'https://vercel.com/docs/cli' }),
  tool({ id: 'netlify_cli', name: 'Netlify CLI', category: 'web', wingetId: 'Netlify.NetlifyCLI', commands: [{ command: 'netlify', versionArg: '--version' }], homepage: 'https://docs.netlify.com/cli/get-started/' }),
  tool({ id: 'heroku_cli', name: 'Heroku CLI', category: 'web', wingetId: 'Heroku.HerokuCLI', commands: [{ command: 'heroku', versionArg: '--version' }], homepage: 'https://devcenter.heroku.com/articles/heroku-cli' }),
  tool({ id: 'ngrok', name: 'ngrok', category: 'web', wingetId: 'ngrok.ngrok', commands: [{ command: 'ngrok', versionArg: 'version' }], homepage: 'https://ngrok.com/' }),
  tool({ id: 'stripe_cli', name: 'Stripe CLI', category: 'web', wingetId: 'Stripe.StripeCLI', commands: [{ command: 'stripe', versionArg: '--version' }], homepage: 'https://stripe.com/docs/stripe-cli' }),
  tool({ id: 'supabase_cli', name: 'Supabase CLI', category: 'web', wingetId: 'Supabase.CLI', commands: [{ command: 'supabase', versionArg: '--version' }], homepage: 'https://supabase.com/docs/guides/cli' }),
  tool({ id: 'prisma_cli', name: 'Prisma CLI', category: 'web', wingetId: 'Prisma.PrismaCLI', commands: [{ command: 'prisma', versionArg: '--version' }], homepage: 'https://www.prisma.io/docs/orm/tools/prisma-cli' }),

  tool({ id: 'php', name: 'PHP', category: 'php', wingetId: 'PHP.PHP', commands: [{ command: 'php', versionArg: '--version' }], homepage: 'https://www.php.net/' }),
  tool({ id: 'composer', name: 'Composer', category: 'php', wingetId: 'Composer.Composer', commands: [{ command: 'composer', versionArg: '--version' }], homepage: 'https://getcomposer.org/' }),

  tool({ id: 'ruby', name: 'RubyInstaller with Devkit', category: 'ruby', wingetId: 'RubyInstallerTeam.RubyWithDevKit.3.2', commands: [{ command: 'ruby', versionArg: '--version' }], homepage: 'https://rubyinstaller.org/' }),
  tool({ id: 'active_state_cli', name: 'ActiveState CLI', category: 'ruby', wingetId: 'ActiveState.ActiveStateCLI', commands: [{ command: 'state', versionArg: '--version' }], homepage: 'https://www.activestate.com/products/platform/state-tool/' }),

  tool({ id: 'erlang', name: 'Erlang/OTP', category: 'functional', wingetId: 'Erlang.ErlangOTP', commands: [{ command: 'erl', versionArg: '-version' }], homepage: 'https://www.erlang.org/' }),
  tool({ id: 'elixir', name: 'Elixir', category: 'functional', wingetId: 'Elixir.Elixir', commands: [{ command: 'elixir', versionArg: '--version' }], homepage: 'https://elixir-lang.org/' }),
  tool({ id: 'haskell_ghcup', name: 'GHCup', category: 'functional', wingetId: 'Haskell.GHCup', commands: [{ command: 'ghcup', versionArg: '--version' }], homepage: 'https://www.haskell.org/ghcup/' }),

  tool({ id: 'godot', name: 'Godot Engine', category: 'game', wingetId: 'GodotEngine.GodotEngine', homepage: 'https://godotengine.org/' }),
  tool({ id: 'unity_hub', name: 'Unity Hub', category: 'game', wingetId: 'Unity.UnityHub', homepage: 'https://unity.com/unity-hub' }),
  tool({ id: 'blender', name: 'Blender', category: 'game', wingetId: 'BlenderFoundation.Blender', commands: [{ command: 'blender', versionArg: '--version' }], homepage: 'https://www.blender.org/' }),

  tool({ id: 'pandoc', name: 'Pandoc', category: 'docs', wingetId: 'JohnMacFarlane.Pandoc', commands: [{ command: 'pandoc', versionArg: '--version' }], homepage: 'https://pandoc.org/' }),
  tool({ id: 'hugo', name: 'Hugo', category: 'docs', wingetId: 'Hugo.Hugo.Extended', commands: [{ command: 'hugo', versionArg: 'version' }], homepage: 'https://gohugo.io/' }),
  tool({ id: 'mkdocs', name: 'MkDocs', category: 'docs', wingetId: '', commands: [{ command: 'mkdocs', versionArg: '--version' }], homepage: 'https://www.mkdocs.org/', source: 'manual', notes: 'Install with pipx or pip. No stable winget package is configured yet.' })
]

const catalog = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  purpose: 'Full-category online developer tool catalog for DevEnv Manager.',
  categories: Object.entries(categories).map(([id, name]) => ({ id, name })),
  tools,
  suites
}

const outputPath = path.join(repoRoot, 'data/catalog-tools.json')
fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`)
console.log(`Wrote ${path.relative(repoRoot, outputPath)} with ${tools.length} tools.`)
