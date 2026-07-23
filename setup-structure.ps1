$folders = @(
    ".github",
    "docs",
    "src/app",
    "src/core/_tests_",
    "src/store",
    "src/scene",
    "src/ui",
    "src/pages",
    "src/api",
    "src/styles"
)

$files = @(
    ".github/CODEOWNERS",
    "docs/kararlar.md",
    "docs/sample-project.json",

    "src/app/main.tsx",
    "src/app/App.tsx",
    "src/app/router.tsx",

    "src/core/model.ts",
    "src/core/coords.ts",
    "src/core/snap.ts",
    "src/core/wall.ts",
    "src/core/room.ts",
    "src/core/floorClone.ts",
    "src/core/pipe.ts",
    "src/core/graph.ts",
    "src/core/validate.ts",
    "src/core/bom.ts",
    "src/core/pdf.ts",
    "src/core/serialize.ts",

    "src/core/_tests_/roundtrip.test.ts",
    "src/core/_tests_/coords.test.ts",
    "src/core/_tests_/room.test.ts",
    "src/core/_tests_/validate.test.ts",

    "src/store/cadStore.ts",
    "src/store/history.ts",
    "src/store/architectureSlice.ts",
    "src/store/floorSlice.ts",
    "src/store/installationSlice.ts",
    "src/store/uiStore.ts",

    "src/scene/SceneRoot.tsx",
    "src/scene/Cameras.tsx",
    "src/scene/DrawSurface.tsx",
    "src/scene/Grid.tsx",
    "src/scene/layers.ts",
    "src/scene/Wall.tsx",
    "src/scene/PointHandle.tsx",
    "src/scene/Room.tsx",
    "src/scene/Pipe.tsx",
    "src/scene/Fitting.tsx",
    "src/scene/Equipment.tsx",
    "src/scene/Warning.tsx",

    "src/ui/Toolbar.tsx",
    "src/ui/FloorTabs.tsx",
    "src/ui/PropertyPanel.tsx",
    "src/ui/WarningList.tsx",
    "src/ui/ExportDialog.tsx",

    "src/pages/LoginPage.tsx",
    "src/pages/RegisterPage.tsx",
    "src/pages/ProjectListPage.tsx",
    "src/pages/EditorPage.tsx",

    "src/api/http.ts",
    "src/api/projects.ts",

    "src/styles/index.css",

    ".env.example",
    "vitest.config.ts"
)

foreach ($folder in $folders) {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
}

foreach ($file in $files) {
    New-Item -ItemType File -Force -Path $file | Out-Null
}

Write-Host "Tüm klasörler ve dosyalar oluşturuldu."