Hooks.on("init", registerSetting);

const moduleName = "find-the-culprit";

function registerSetting() {
  game.settings.register(moduleName, "modules", {
    default: {},
    type: Object,
    config: false,
  });
  game.settings.register(moduleName, "locks", {
    default: {},
    type: Object,
    config: false,
  });
}

Hooks.on("renderModuleManagement", onRenderModuleManagement);

function onRenderModuleManagement(app, html, options) {
  const footer = html[0].querySelector("footer");
  const btn = document.createElement("button");
  btn.innerHTML = '<i class="fas fa-search"></i> Find the culprit!';
  btn.addEventListener("click", startDebugging);
  const div = document.createElement("div");
  div.classList.add("ftc-submit-div");
  footer.append(btn);
}

function startDebugging(ev) {
  ev.preventDefault();
  ev.stopPropagation();

  let original = game.settings.get("core", ModuleManagement.CONFIG_SETTING);
  let settings = {
    original,
    active: Object.keys(original).filter(
      (e) => original[e] && e !== moduleName
    ),
    step: 0,
  };
  let locks = game.settings.get(moduleName, "locks");

  const app = new Dialog({
    title: "Find the culprit",
    content: `<p>Choose modules to keep active:</p>
                            <input type="text" name="search" placeholder="Filter Modules" value="">
							<ul class='ftc-module-list ftc-module-chooser'>
								${settings.active
                  .map(
                    (e) =>
                      `<li data-module="${e}">
                        <label class="ftc-lock-checkbox">
                        <input class="lock-btn hidden" type="checkbox" data-module="${e}" tabindex="-1" ${locks[e] ? "checked" : ""}/>
                        <span class="fas lock"></span>
                        </label><input class="ftc-checkbox" type="checkbox" data-module="${e}" id="ftc-${e}" ${locks[e] ? "checked" : ""}><label class="package-title" for="${e}">${
                        game.modules.get(e)?.data.title
                      }</label></li>`,
                  )
                  .join("")}
							</ul>
							<p>After clicking start the page will refresh and you will be prompted to check whether your issue still exists. This will repeat multiple times until the culprit was found.</p>
							<p>After the culprit was found you will be able to choose whether you want to reactivate all currently activated modules or not.</p>
							<p>Don't worry if you accidently close one of the popups, just refresh the page manually and it will reappear.</p>`,
    buttons: {
      yes: {
        icon: '<i class="fas fa-check"></i>',
        label: "Start",
        callback: async (html) => {
          const chosen = Array.from(
            html[0].querySelectorAll('input[type="checkbox"].ftc-checkbox:checked',) || [],
          ).map((e) => e.dataset.module);

          settings.active = settings.active.filter((e) => !chosen.includes(e));
          settings.chosen = chosen;
          await game.settings.set(moduleName, "modules", settings);
          deactivationStep([]);
        },
      },
      no: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel",
      },
    },
  }).render(true);
  const search = new SearchFilter({
    inputSelector: 'input[name="search"]',
    contentSelector: ".ftc-module-list",
    callback: (event, query, rgx, html) => {
      for (let li of html.children) {
        if (!query) {
          li.classList.remove("hidden");
          continue;
        }
        const name = li.dataset.module;
        const title = (li.querySelector(".package-title")?.textContent || "")
          .trim();
        const match = rgx.test(SearchFilter.cleanQuery(name)) ||
          rgx.test(SearchFilter.cleanQuery(title));
        li.classList.toggle("hidden", !match);
      }
    },
  });

  async function _onChangeCheckbox(ev) {
    const input = ev.target;
    const name = input.getAttribute("data-module");
    const module = game.modules.get(name);
    const lock = app.element.find(`input.lock-btn[data-module=${name}]`)[0];
    if ( !module.data.dependencies?.length ) return;
    const allCheckboxes = app.element.find("input.ftc-checkbox").toArray();
    const checkBoxes = [];
    const locks = [];

    const dependenciesNotMatchingDesiredState = module.data.dependencies.filter(x => {
      const dependency = allCheckboxes.find((checkbox) => checkbox.getAttribute("data-module") === x.name);
      if (dependency && dependency.checked !== input.checked) {
          checkBoxes.push(dependency);
          const dependencyLock = app.element.find(`input.lock-btn[data-module=${x.name}]`)[0];
          if (lock.checked !== dependencyLock.checked) locks.push(dependencyLock);
          return true;
      }
      return false;
    });

    if ( dependenciesNotMatchingDesiredState.length == 0 ) return;

    let html = await renderTemplate("templates/setup/impacted-dependencies.html", {
      enabling: input.checked,
      dependencies: dependenciesNotMatchingDesiredState
    });

    return Dialog.confirm({
      title: game.i18n.localize("MODMANAGE.Dependencies"),
      content: html,
      yes: () => {
        locks.forEach(checkbox => {
            checkbox.checked = lock.checked;
            $(checkbox).trigger("change");
        });
        checkBoxes.forEach(checkbox => {
          checkbox.checked = input.checked;
          $(checkbox).trigger("change");
        });
      },
      no: () => {}
    });
  }

  const renderHook = Hooks.on("renderDialog", (dialog, html) => {
    if (dialog.appId === app.appId) {
      search.bind(html[0]);
      html.find("input.lock-btn").on("change", (ev) => {
        const el = ev.target;
        const name = el.getAttribute("data-module");
        const target = html.find(`input.ftc-checkbox[data-module=${name}]`)[0];
        target.checked = el.checked;
        locks[name] = target.checked;
        $(target).trigger("change");
      });
      html.find("input.ftc-checkbox").on("change", _onChangeCheckbox);
      const closeHook = Hooks.on("closeDialog", (dialog, html) => {
        if (dialog.appId === app.appId) {
          game.settings.set(moduleName, "locks", locks);
        }
        Hooks.off(closeHook);
      });
      Hooks.off(renderHook);
    }
  });
}

Hooks.on("ready", doStep);

async function doStep() {
  const curr = game.settings.get(moduleName, "modules");

  if (curr.step === undefined) return;

  if (curr.step === 0) return doFirstStep();

  return doBinarySearchStep();
  // if (curr.active?.length) ;
}

function renderFinalDialog(culprit) {
  new Dialog({
    title: "Found the culprit!",
    content: `<h2>We found the culprit!</h2>
							<ul class='ftc-module-list'>
								<li title="Currently active."><i class="fas fa-check ftc-active"></i>${
                  game.modules.get(culprit).data.title
                }</li>
							</ul>`,
    buttons: {
      yes: {
        label: "Reactivate all modules?",
        callback: async () => {
          await reactivateModules();
          resetSettings();
        },
      },
      no: {
        icon: '<i class="fas fa-times"></i>',
        label: "No",
        callback: resetSettings,
      },
    },
  }).render(true);
}

function doFirstStep() {
  const curr = game.settings.get(moduleName, "modules");
  new Dialog({
    title: "Find the culprit!",
    content: `<p>All modules, except your chosen ones, are deactivated.</p>
							<p>Does your issue persist?</p>`,
    buttons: {
      yes: {
        icon: '<i class="fas fa-check"></i>',
        label: "Yes",
        callback: () => {
          const chosen = curr.chosen;
          new Dialog({
            title: "Find the Culprit",
            content: `<p>Seems like the issue is a bug in ${
              chosen?.length
                ? `your chosen module list: 	
								<ul class='ftc-module-list'>
									${chosen.map((e) => `<li>- ${game.modules.get(e).data.title}</li>`).join("")}
								</ul>`
                : "the core software."
            }</p>`,
            buttons: {
              yes: {
                label: "Reactivate all modules",
                callback: async () => {
                  await reactivateModules();
                  resetSettings();
                },
              },
              no: {
                icon: '<i class="fas fa-times"></i>',
                label: "No",
              },
            },
          }).render(true);
        },
      },
      no: {
        icon: '<i class="fas fa-times"></i>',
        label: "No",
        callback: async () => {
          const curr = game.settings.get(moduleName, "modules");
          curr.step = 1;
          await game.settings.set(moduleName, "modules", curr);
          deactivationStep(curr.active);
        },
      },
    },
  }).render(true);
}

function doBinarySearchStep() {
  const curr = game.settings.get(moduleName, "modules");
  const numActive = curr.active?.length || 0,
    numInactive = curr.inactive?.length || 0,
    stepsLeft =
      Math.ceil(Math.log2(numActive > numInactive ? numActive : numInactive)) +
      1;
  new Dialog({
    title: `Find the culprit`,
    content: `<h2>Current statistics</h2>
							<p>${numActive + numInactive} modules still in list.<br>
							Remaining steps &leq; ${stepsLeft}.<br>
							Current module list:
								<ul class='ftc-module-list'>
									${(curr.active || [])
                    .map(
                      (e) =>
                        `<li title="Currently active."><i class="fas fa-check ftc-active"></i>${
                          game.modules.get(e).data.title
                        }</li>`
                    )
                    .join("")}
									${(curr.inactive || [])
                    .map(
                      (e) =>
                        `<li title="Currently inactive."><i class="fas fa-times ftc-inactive"></i>${
                          game.modules.get(e).data.title
                        }</li>`
                    )
                    .join("")}
								</ul>
							</p>
							<h2></h2>
							<h2 style="text-align:center; border-bottom: none;">Does your issue persist?</h2>`,
    buttons: {
      yes: {
        icon: '<i class="fas fa-check"></i>',
        label: "Yes",
        callback: async () => {
          deactivationStep(curr.active);
        },
      },
      no: {
        icon: '<i class="fas fa-times"></i>',
        label: "No",
        callback: async () => {
          deactivationStep(curr.inactive);
        },
      },
      reset: {
        icon: '<i class="fas fa-redo-alt"></i>',
        label: "Reset",
        callback: async () => {
          await reactivateModules();
          resetSettings();
        },
      },
    },
  }).render(true);
}

async function deactivationStep(chosenModules = []) {
  if (chosenModules.length === 1) return renderFinalDialog(chosenModules[0]);

  const currSettings = game.settings.get(moduleName, "modules");

  let original = game.settings.get("core", ModuleManagement.CONFIG_SETTING);

  // deactivate all modules
  const deactivate = Object.keys(original).filter(
    (e) => !currSettings.chosen.includes(e) && e !== moduleName
  );
  for (let module of deactivate) original[module] = false;

  if (chosenModules.length > 0) {
    const half = Math.ceil(chosenModules.length / 2);
    currSettings.inactive = chosenModules.slice(half);
    currSettings.active = chosenModules.slice(0, half);
    // activate only first half
    for (let module of currSettings.active) original[module] = true;

    await game.settings.set(moduleName, "modules", currSettings);
  }

  game.settings.set("core", ModuleManagement.CONFIG_SETTING, original);
}

async function reactivateModules() {
  const curr = game.settings.get(moduleName, "modules");
  let original = duplicate(
    game.settings.get("core", ModuleManagement.CONFIG_SETTING)
  );
  for (let mod in curr.original) original[mod] = curr.original[mod];

  game.settings.set("core", ModuleManagement.CONFIG_SETTING, original);
}

async function resetSettings() {
  return game.settings.set(moduleName, "modules", {
    "-=step": null,
    "-=active": null,
    "-=original": null,
    "-=inactive": null,
  });
}
