from pathlib import Path
import json
import subprocess
import sys


BACKEND_ROOT = Path(__file__).parent
REPO_ROOT = BACKEND_ROOT.parent


def test_runtime_manifest_excludes_test_only_packages_and_dev_manifest_includes_them():
    runtime = (BACKEND_ROOT / "requirements.txt").read_text()
    development = (BACKEND_ROOT / "requirements-dev.txt").read_text()

    assert "pytest" not in runtime
    assert "pytest==" in development
    assert "pytest-asyncio==" in development
    assert "-r requirements.txt" in development


def test_ci_installs_development_manifest_for_backend_tests():
    workflow = (REPO_ROOT / ".github/workflows/ci.yml").read_text()

    assert "cache-dependency-path: backend/requirements-dev.txt" in workflow
    assert "run: pip install -r requirements-dev.txt" in workflow


def test_docker_recipes_install_only_runtime_manifest():
    for dockerfile in (REPO_ROOT / "Dockerfile.ghs-backend", BACKEND_ROOT / "Dockerfile"):
        text = dockerfile.read_text()
        assert "requirements-dev.txt" not in text
        assert "pip install --no-cache-dir -r requirements.txt" in text


def test_runtime_dependency_checker_passes_for_repository_manifests():
    result = subprocess.run(
        [sys.executable, "scripts/check_runtime_dependencies.py"],
        cwd=BACKEND_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr or result.stdout
    assert json.loads(result.stdout)["ok"] is True
