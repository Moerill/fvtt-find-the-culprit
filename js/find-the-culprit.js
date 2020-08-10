Hooks.on('init', registerSetting);

const moduleName = 'find-the-culprit';

function registerSetting() {
	game.settings.register(moduleName, 'modules', {
		default: {},
		type: Object,
		config: false
	})
}

Hooks.on('renderModuleManagement', onRenderModuleManagement)

function onRenderModuleManagement(app, html, options) {
	const form = html[0].querySelector('form');
	const btn = form.insertBefore(document.createElement('button'), form.children[0]);
	btn.innerText = "Find the culprit!"
	btn.addEventListener('click', startDebugging);
}

function startDebugging(ev) {
	ev.preventDefault(); ev.stopPropagation();

	let original = game.settings.get("core", ModuleManagement.CONFIG_SETTING);
	let settings = {
		original,
		current: Object.keys(original).filter(e => original[e] && e !== moduleName),
		step: 0
	};

	new Dialog({
		title: 'Find the culprit',
		content: `<p>Choose a module to keep active:</p>
							<select>
								<option value="">None</option>
								${settings.current.map(e => `<option value="${e}">${game.modules.get(e)?.data.title}</option>`).join('')}
							</select>
							<p>After clicking start the page will refresh and you will be prompted to check whether your issue still exists. This will repeat multiple times until the culprit was found.</p>
							<p>After the culprit was found you will be able to choose whether you want to reactivate all currently activated modules or not.</p>
							<p>Don't worry if you accidently close one of the popups, just refresh the page manually and it will reappear.</p>`,
		buttons: {
			yes: {
				icon: '<i class="fas fa-check"></i>',
				label: "Start",
				callback: async (html) => {
					const chosen = html[0].querySelector('select').value;
					settings.current = settings.current.filter(e => e !== chosen);
					settings.chosen = chosen;
					await game.settings.set(moduleName, 'modules', settings);
					deactivationStep();
				}
			},
			no: {
				icon: '<i class="fas fa-times"></i>',
				label: "Cancel"
			}
		}
	}).render(true);
}

Hooks.on('ready', doStep);

async function doStep() {
	const curr = game.settings.get(moduleName, 'modules');

	if (curr.step === undefined) return;

	if (curr.step === 0) return doFirstStep();

	if (curr.current?.length > 1) return doBinarySearchStep();

	new Dialog({
		title: 'Find the culprit, 1 Module active.',
		content: `<p>Does your issue persist?</p>`,
		buttons: {
			yes: {
				icon: '<i class="fas fa-check"></i>',
				label: "Yes",
				callback: async () => {
					if (curr.last.length === 1)
						return renderFinalDialog(curr.last[0]);
										
					curr.current = curr.last.slice(0, Math.floor(curr.last.length / 2));
					curr.last = curr.last.slice(Math.floor(curr.last.length / 2));
					await game.settings.set(moduleName, 'modules', curr);
					deactivationStep();
				}
			},
			no: {
				icon: '<i class="fas fa-times"></i>',
				label: "No",
				callback: async () => {
					renderFinalDialog(curr.current[0]);
				}
			}
		}
	}).render(true);

}

function renderFinalDialog(culprit) {
	console.log(culprit);
	new Dialog({
		title: 'Found the culprit!',
		content: `<p>We found the culprit!</p>
							<p>It is <span style="font-weight: bold;">${game.modules.get(culprit).data.title}</span></p>`,
		buttons: {
			yes: {
				label: 'Reactivate all modules?',
				callback: reactivateModules
			},
			no: {
				icon: '<i class="fas fa-times"></i>',
				label: "No",
			}
		}
	}).render(true);
}

function doFirstStep() {
	const curr = game.settings.get(moduleName, 'modules');
	new Dialog({
		title: 'Find the culprit, All modules deactivated.',
		content: `<p>Does your issue persist?</p>`,
		buttons: {
			yes: {
				icon: '<i class="fas fa-check"></i>',
				label: "Yes",
				callback: async () => {
					const curr = game.settings.get(moduleName, 'modules');
					curr.step = 1;
					await game.settings.set(moduleName, 'modules', curr);
					deactivationStep();
				}
			},
			no: {
				icon: '<i class="fas fa-times"></i>',
				label: "No",
				callback: () => {
					const chosen = game.modules.get(curr.chosen)?.data?.title
					new Dialog({
						title: 'Find the Culprit',
						content: `<p>Seems like the issue is a bug in ${chosen ? chosen : 'the core software'} itself!</p>`,
						buttons: {
							yes: {
								label: 'Reactivate all modules',
								callback: reactivateModules
							},
							no: {
								icon: '<i class="fas fa-times"></i>',
								label: "No",
							}
						}
					}).render(true);
				}
			}
		}
	}).render(true);
}

function doBinarySearchStep() {
	const curr = game.settings.get(moduleName, 'modules');
	new Dialog({
		title: `Find the culprit, ${curr.current.length} modules left`,
		content: `<p>Does your issue persist?</p>`,
		buttons: {
			yes: {
				icon: '<i class="fas fa-check"></i>',
				label: "Yes",
				callback: async () => {
					curr.last = curr.current.slice(Math.floor(curr.current.length / 2));
					curr.current = curr.current.slice(0, Math.floor(curr.current.length / 2));
					await game.settings.set(moduleName, 'modules', curr);
					deactivationStep();
				}
			},
			no: {
				icon: '<i class="fas fa-times"></i>',
				label: "No",
				callback: async () => {
						curr.last = curr.current.slice(0, Math.floor(curr.current.length / 2));
						curr.current = curr.current.slice(Math.floor(curr.current.length / 2) + 1);
						await game.settings.set(moduleName, 'modules', curr);
						deactivationStep();
				}
			}
		}
	}).render(true);
}

function deactivationStep() {
	const curr = game.settings.get(moduleName, 'modules');
	console.log(curr);
	let original = game.settings.get("core", ModuleManagement.CONFIG_SETTING);
	// deactivate all modules
	const deactivate = Object.keys(original).filter(e => e !== curr.chosen && e !== moduleName);
	for (let module of deactivate)
		original[module] = false;
	// activate only first half
	for (let i = 0; i < Math.floor(curr.current.length / 2); i++)
		original[curr.current[i]] = true;

	game.settings.set('core', ModuleManagement.CONFIG_SETTING, original);
}

async function reactivateModules() {
	const curr = game.settings.get(moduleName, 'modules');
	let original = duplicate(game.settings.get('core', ModuleManagement.CONFIG_SETTING));
	for (let mod in curr.original) 
		original[mod] = curr.original[mod];

	await game.settings.set(moduleName, 'modules', {'-=step': null, '-=current': null, '-=original': null});
	game.settings.set('core', ModuleManagement.CONFIG_SETTING, original);
}