export function Licenses() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 py-6 text-sm leading-relaxed">
      <header>
        <h1 className="font-serif text-4xl tracking-tight">Licenses</h1>
        <p className="mt-2 text-muted">
          Higgsfield is the product name in this window. The code in this repository is original and MIT licensed.
        </p>
      </header>
      <section className="space-y-2">
        <h2 className="font-serif text-2xl">What this build includes</h2>
        <p>
          Skill names, CLI subcommands, and model identifiers from the public Higgsfield repositories. Copyright (c)
          2026 Higgsfield AI. The skills repository and the CLI are MIT. The training framework and the Python client
          are Apache-2.0. Their source is not copied into this app. NOTICES.md in the repository repeats this.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-serif text-2xl">What this build leaves out</h2>
        <p>
          Hosted model weights are not in the public repositories. This app generates with the open model BK-SDM Tiny
          on this machine and saves the file in the output folder. That run does not use Soul, Kling, Veo, Seedance, or
          the other hosted weights.
        </p>
        <p>
          The upstream desktop shell is dual-licensed AGPL-3.0-or-later or a commercial license from Comfy Org,
          copyright (c) Comfy Org. The graph editor it launches is GPL-3.0. A rebrand of those programs is allowed only
          as a copyleft derivative that keeps their copyright, marks the changes, and ships source. Their trademarks and
          logos are not granted. This slice does not copy that code, so those names are not the product brand and their
          logos are not in the window.
        </p>
        <p>
          The Node SDK has no LICENSE file in git even though its package metadata says MIT, so it is not vendored. The
          app-template registry has no license file, so it is not copied. Website creation still goes through the CLI.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-serif text-2xl">This app</h2>
        <p>
          Copyright (c) 2026 Higgsfield Local contributors. MIT License. There is no warranty. See the LICENSE file
          shipped with the source.
        </p>
      </section>
    </div>
  )
}
