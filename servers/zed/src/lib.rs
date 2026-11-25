use std::collections::BTreeMap;
use zed_extension_api::{
    self as zed, LanguageServerId, Worktree,
    settings::{CommandSettings, LspSettings},
};

const SERVER_ID: &str = "cssdoc-language-server";
const PACKAGE: &str = "@cssdoc/language-server";
const VERSION: &str = "0.20.1";
const SERVER_SCRIPT: &str = "node_modules/@cssdoc/language-server/bin/cssdoc-language-server.mjs";

struct CssdocExtension;

trait ServerHost {
    fn shell_env(&self) -> Vec<(String, String)>;
    fn which(&self, name: &str) -> Option<String>;
    fn node_binary(&self) -> zed::Result<String>;
    fn node_supported(&self, path: &str) -> zed::Result<bool>;
    fn installed_version(&self) -> zed::Result<Option<String>>;
    fn server_script(&self) -> zed::Result<std::path::PathBuf>;
    fn script_exists(&self, script: &std::path::Path) -> bool;
    fn install(&self) -> zed::Result<()>;
}

struct ZedHost<'a> {
    id: &'a LanguageServerId,
    worktree: &'a Worktree,
}

fn node_supported(version: &str) -> bool {
    version
        .trim()
        .strip_prefix('v')
        .and_then(|v| v.split('.').next())
        .and_then(|major| major.parse::<u32>().ok())
        .is_some_and(|major| major >= 26)
}

fn compatible_node(path: &str) -> zed::Result<bool> {
    let output = zed::process::Command::new(path)
        .arg("--version")
        .output()
        .map_err(|error| format!("Cannot check Node.js at {path}: {error}"))?;
    if output.status != Some(0) {
        return Err(format!(
            "Cannot check Node.js at {path}: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    let version = String::from_utf8(output.stdout).map_err(|error| error.to_string())?;
    Ok(node_supported(&version))
}

impl ServerHost for ZedHost<'_> {
    fn shell_env(&self) -> Vec<(String, String)> {
        self.worktree.shell_env()
    }

    fn which(&self, name: &str) -> Option<String> {
        self.worktree.which(name)
    }

    fn node_binary(&self) -> zed::Result<String> {
        zed::node_binary_path()
    }

    fn node_supported(&self, path: &str) -> zed::Result<bool> {
        compatible_node(path)
    }

    fn installed_version(&self) -> zed::Result<Option<String>> {
        zed::npm_package_installed_version(PACKAGE)
    }

    fn server_script(&self) -> zed::Result<std::path::PathBuf> {
        Ok(std::env::current_dir()
            .map_err(|error| format!("Cannot find the extension work directory: {error}"))?
            .join(SERVER_SCRIPT))
    }

    fn script_exists(&self, script: &std::path::Path) -> bool {
        script.is_file()
    }

    fn install(&self) -> zed::Result<()> {
        zed::set_language_server_installation_status(
            self.id,
            &zed::LanguageServerInstallationStatus::Downloading,
        );
        let result = zed::npm_install_package(PACKAGE, VERSION)
            .map_err(|error| format!("Cannot install {PACKAGE}@{VERSION}: {error}"))
            .and_then(|()| {
                if self.server_script()?.is_file() {
                    Ok(())
                } else {
                    Err(format!(
                        "Installed {PACKAGE}@{VERSION} is missing {SERVER_SCRIPT}"
                    ))
                }
            });
        if let Err(message) = result {
            zed::set_language_server_installation_status(
                self.id,
                &zed::LanguageServerInstallationStatus::Failed(message.clone()),
            );
            return Err(message);
        }
        zed::set_language_server_installation_status(
            self.id,
            &zed::LanguageServerInstallationStatus::None,
        );
        Ok(())
    }
}

fn server_command(
    host: &impl ServerHost,
    binary: Option<CommandSettings>,
) -> zed::Result<zed::Command> {
    let mut env: BTreeMap<String, String> = host.shell_env().into_iter().collect();
    if let Some(extra) = binary.as_ref().and_then(|value| value.env.as_ref()) {
        env.extend(
            extra
                .iter()
                .map(|(key, value)| (key.clone(), value.clone())),
        );
    }
    let args = binary
        .as_ref()
        .and_then(|value| value.arguments.clone())
        .unwrap_or_else(|| vec!["--stdio".into()]);
    if let Some(path) = binary
        .as_ref()
        .and_then(|value| value.path.clone())
        .or_else(|| host.which(SERVER_ID))
    {
        return Ok(zed::Command {
            command: path,
            args,
            env: env.into_iter().collect(),
        });
    }

    let managed_node = host.node_binary();
    let node = match &managed_node {
        Ok(path) if host.node_supported(path)? => path.clone(),
        _ => match host.which("node") {
            Some(path) if host.node_supported(&path)? => path,
            _ => {
                let detail = managed_node
                    .err()
                    .map(|error| format!(" Zed's Node.js runtime: {error}"))
                    .unwrap_or_default();
                return Err(format!(
                    "cssdoc requires Node.js 26 or newer. Install a compatible Node.js version or configure a cssdoc-language-server binary in Zed's lsp settings.{detail}"
                ));
            }
        },
    };
    let script = host.server_script()?;
    if host.installed_version()?.as_deref() != Some(VERSION) || !host.script_exists(&script) {
        host.install()?;
        if !host.script_exists(&script) {
            return Err(format!(
                "Installed {PACKAGE}@{VERSION} is missing {SERVER_SCRIPT}"
            ));
        }
    }
    let mut node_args = vec![script.to_string_lossy().into_owned()];
    node_args.extend(args);
    Ok(zed::Command {
        command: node,
        args: node_args,
        env: env.into_iter().collect(),
    })
}

impl zed::Extension for CssdocExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        id: &LanguageServerId,
        worktree: &Worktree,
    ) -> zed::Result<zed::Command> {
        let settings = LspSettings::for_worktree(SERVER_ID, worktree)?;
        server_command(&ZedHost { id, worktree }, settings.binary)
    }

    fn language_server_initialization_options(
        &mut self,
        _: &LanguageServerId,
        worktree: &Worktree,
    ) -> zed::Result<Option<zed::serde_json::Value>> {
        Ok(LspSettings::for_worktree(SERVER_ID, worktree)?.initialization_options)
    }

    fn language_server_workspace_configuration(
        &mut self,
        _: &LanguageServerId,
        worktree: &Worktree,
    ) -> zed::Result<Option<zed::serde_json::Value>> {
        Ok(LspSettings::for_worktree(SERVER_ID, worktree)?.settings)
    }
}

zed::register_extension!(CssdocExtension);

#[cfg(test)]
mod tests {
    use super::{ServerHost, VERSION, node_supported, server_command};
    use std::{
        cell::Cell,
        collections::HashMap,
        path::{Path, PathBuf},
    };
    use zed_extension_api::{self as zed, settings::CommandSettings};

    struct MockHost {
        server: Option<String>,
        path_node: Option<String>,
        managed_supported: bool,
        path_supported: bool,
        node_error: Option<String>,
        version: Option<String>,
        script_exists: Cell<bool>,
        install_error: Option<String>,
        install_creates_script: bool,
        installs: Cell<usize>,
    }

    impl Default for MockHost {
        fn default() -> Self {
            Self {
                server: None,
                path_node: None,
                managed_supported: true,
                path_supported: false,
                node_error: None,
                version: None,
                script_exists: Cell::new(false),
                install_error: None,
                install_creates_script: true,
                installs: Cell::new(0),
            }
        }
    }

    impl ServerHost for MockHost {
        fn shell_env(&self) -> Vec<(String, String)> {
            vec![
                ("PATH".into(), "/bin".into()),
                ("MODE".into(), "shell".into()),
            ]
        }

        fn which(&self, name: &str) -> Option<String> {
            match name {
                "cssdoc-language-server" => self.server.clone(),
                "node" => self.path_node.clone(),
                _ => None,
            }
        }

        fn node_binary(&self) -> zed::Result<String> {
            match &self.node_error {
                Some(error) => Err(error.clone()),
                None => Ok("/managed/node".into()),
            }
        }

        fn node_supported(&self, path: &str) -> zed::Result<bool> {
            Ok(if path == "/managed/node" {
                self.managed_supported
            } else {
                self.path_supported
            })
        }

        fn installed_version(&self) -> zed::Result<Option<String>> {
            Ok(self.version.clone())
        }

        fn server_script(&self) -> zed::Result<PathBuf> {
            Ok("/extension/node_modules/server.mjs".into())
        }

        fn script_exists(&self, _: &Path) -> bool {
            self.script_exists.get()
        }

        fn install(&self) -> zed::Result<()> {
            self.installs.set(self.installs.get() + 1);
            if let Some(error) = &self.install_error {
                return Err(error.clone());
            }
            self.script_exists.set(self.install_creates_script);
            Ok(())
        }
    }

    #[test]
    fn requires_a_supported_node_version() {
        assert!(node_supported("v26.0.0"));
        assert!(node_supported("v27.1.0\n"));
        assert!(!node_supported("v25.9.0"));
        assert!(!node_supported("invalid"));
    }

    #[test]
    fn pinned_version_matches_the_workspace_server() {
        let package: zed::serde_json::Value =
            zed::serde_json::from_str(include_str!("../../language-server/package.json")).unwrap();
        assert_eq!(package["version"], VERSION);
    }

    #[test]
    fn configured_binary_takes_precedence_and_merges_environment() {
        let host = MockHost {
            server: Some("/path/server".into()),
            ..MockHost::default()
        };
        let binary = CommandSettings {
            path: Some("/custom/server".into()),
            arguments: Some(vec!["--custom".into()]),
            env: Some(HashMap::from([("MODE".into(), "custom".into())])),
        };
        let command = server_command(&host, Some(binary)).unwrap();
        assert_eq!(command.command, "/custom/server");
        assert_eq!(command.args, ["--custom"]);
        assert_eq!(
            command.env,
            [
                ("MODE".into(), "custom".into()),
                ("PATH".into(), "/bin".into())
            ]
        );
        assert_eq!(host.installs.get(), 0);
    }

    #[test]
    fn path_binary_takes_precedence_over_managed_install() {
        let host = MockHost {
            server: Some("/path/server".into()),
            ..MockHost::default()
        };
        let command = server_command(&host, None).unwrap();
        assert_eq!(command.command, "/path/server");
        assert_eq!(command.args, ["--stdio"]);
        assert_eq!(host.installs.get(), 0);
    }

    #[test]
    fn installs_when_missing_or_incomplete_and_reuses_matching_cache() {
        let host = MockHost::default();
        let command = server_command(&host, None).unwrap();
        assert_eq!(command.command, "/managed/node");
        assert_eq!(
            command.args,
            ["/extension/node_modules/server.mjs", "--stdio"]
        );
        assert_eq!(host.installs.get(), 1);

        let cached = MockHost {
            version: Some(VERSION.into()),
            script_exists: Cell::new(true),
            ..MockHost::default()
        };
        server_command(&cached, None).unwrap();
        assert_eq!(cached.installs.get(), 0);
        cached.script_exists.set(false);
        server_command(&cached, None).unwrap();
        assert_eq!(cached.installs.get(), 1);
    }

    #[test]
    fn uses_compatible_path_node_when_zeds_node_is_too_old() {
        let host = MockHost {
            managed_supported: false,
            path_node: Some("/path/node".into()),
            path_supported: true,
            ..MockHost::default()
        };
        assert_eq!(server_command(&host, None).unwrap().command, "/path/node");

        let unavailable = MockHost {
            node_error: Some("runtime unavailable".into()),
            path_node: Some("/path/node".into()),
            path_supported: true,
            ..MockHost::default()
        };
        assert_eq!(
            server_command(&unavailable, None).unwrap().command,
            "/path/node"
        );
    }

    #[test]
    fn reports_incompatible_node_and_install_failures() {
        let unsupported = MockHost {
            managed_supported: false,
            ..MockHost::default()
        };
        assert!(
            server_command(&unsupported, None)
                .err()
                .unwrap()
                .contains("Node.js 26")
        );
        assert_eq!(unsupported.installs.get(), 0);

        let unavailable = MockHost {
            node_error: Some("runtime unavailable".into()),
            ..MockHost::default()
        };
        assert!(
            server_command(&unavailable, None)
                .err()
                .unwrap()
                .contains("runtime unavailable")
        );

        let failure = MockHost {
            install_error: Some("offline".into()),
            ..MockHost::default()
        };
        assert_eq!(server_command(&failure, None).err().unwrap(), "offline");
        let missing_script = MockHost {
            install_creates_script: false,
            ..MockHost::default()
        };
        assert!(
            server_command(&missing_script, None)
                .err()
                .unwrap()
                .contains("missing")
        );
    }
}
