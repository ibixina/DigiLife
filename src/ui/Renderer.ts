import { engine } from '../core/Engine';
import { events } from '../core/EventBus';
import { performActivity, getAvailableActivities } from '../systems/ActivitySystem';
import { interactWithNPC, getAvailableInteractions } from '../systems/RelationshipSystem';
import { getAvailableEducationActions, performEducationAction } from '../systems/EducationSystem';
import { getAvailableCareerActions, performCareerAction } from '../systems/CareerSystem';

export class Renderer {
  private el: HTMLElement;
  private currentScreen: string = 'TITLE';

  private hasNewActivities: boolean = false;
  private hasNewInteractions: boolean = false;
  private hasNewCareerActions: boolean = false;
  private lastActivitiesCount: number = 0;
  private lastInteractionsCount: number = 0;
  private lastCareerActionsCount: number = 0;

  constructor(elementId: string) {
    this.el = document.getElementById(elementId)!;
    this.render();

    events.on('age_up', () => {
      this.checkNewActions();
      this.render();
    });
    events.on('stat_changed', () => this.render());
    events.on('event_triggered', (event: any) => this.renderEventModal(event));
    events.on('death', () => {
      this.currentScreen = 'DEATH';
      this.render();
    });
  }

  checkNewActions() {
    const actCount = getAvailableActivities(engine.state).length;
    if (actCount > this.lastActivitiesCount) this.hasNewActivities = true;
    this.lastActivitiesCount = actCount;

    let intCount = 0;
    engine.state.relationships.forEach(npc => {
      intCount += getAvailableInteractions(engine.state, npc.id).length;
    });
    if (intCount > this.lastInteractionsCount) this.hasNewInteractions = true;
    this.lastInteractionsCount = intCount;

    const careerActions = getAvailableCareerActions(engine.state).length;
    const educationActions = getAvailableEducationActions(engine.state).length;
    const careerCount = careerActions + educationActions;
    if (careerCount > this.lastCareerActionsCount) this.hasNewCareerActions = true;
    this.lastCareerActionsCount = careerCount;
  }

  render() {
    this.el.innerHTML = '';

    if (this.currentScreen === 'TITLE') {
      this.renderTitleScreen();
    } else if (this.currentScreen === 'GAME') {
      this.renderGameScreen();
    } else if (this.currentScreen === 'DEATH') {
      this.renderDeathScreen();
    }
  }

  renderTitleScreen() {
    const d = document.createElement('div');
    d.className = 'screen title-screen';

    const h1 = document.createElement('h1');
    h1.innerHTML = '<span class="cursor-blink">DigiLife</span>';

    const pre = document.createElement('pre');
    pre.innerText = `  ____  _      _   _     _  __     
 |  _ \\(_)__ _(_) | |   (_)/ _|___ 
 | | | | / _\` | | | |   | |  _/ -_)
 | |_| | \\__, |_| | |___| | | \\___|
 |____/|_|___/    |_____|_|_|      `;

    const btn = document.createElement('button');
    btn.className = 'btn-primary';
    btn.innerText = 'NEW LIFE';
    btn.onclick = () => {
      this.currentScreen = 'CHAR_CREATE';
      this.renderCharCreateScreen();
    };

    d.appendChild(h1);
    d.appendChild(pre);
    d.appendChild(btn);
    this.el.appendChild(d);
  }

  renderCharCreateScreen() {
    this.el.innerHTML = '';
    const d = document.createElement('div');
    d.className = 'screen title-screen';

    const title = document.createElement('h2');
    title.innerText = 'Create Character';

    const form = document.createElement('div');
    form.className = 'char-create-form';

    const fnInput = document.createElement('input');
    fnInput.type = 'text';
    fnInput.placeholder = 'First Name';

    const nationalitySelect = document.createElement('select');
    const nationalities = [
      { code: 'USA', flag: '🇺🇸', names: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'] },
      { code: 'UK', flag: '🇬🇧', names: ['Davies', 'Evans', 'Taylor', 'Wilson', 'Thomas'] },
      { code: 'Japan', flag: '🇯🇵', names: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe'] },
      { code: 'France', flag: '🇫🇷', names: ['Martin', 'Bernard', 'Richard', 'Petit', 'Robert'] },
      { code: 'Brazil', flag: '🇧🇷', names: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues'] }
    ];
    nationalities.forEach(n => {
      const o = document.createElement('option');
      o.value = n.code;
      o.innerText = `${n.flag} ${n.code}`;
      nationalitySelect.appendChild(o);
    });

    const select = document.createElement('select');
    const opts = ['Male', 'Female', 'Non-binary'];
    opts.forEach(g => {
      const o = document.createElement('option');
      o.value = g;
      o.innerText = g;
      select.appendChild(o);
    });

    const btn = document.createElement('button');
    btn.className = 'btn-primary';
    btn.innerText = 'BEGIN';
    btn.onclick = () => {
      const fn = fnInput.value || 'John';
      const natCode = nationalitySelect.value;
      const natData = nationalities.find(n => n.code === natCode) || nationalities[0];
      const ln = natData.names[Math.floor(Math.random() * natData.names.length)];
      const gender = select.value as any;

      engine.startNewLife(fn, ln, gender as any, natCode);
      this.currentScreen = 'GAME';
      this.render();
    };

    form.appendChild(fnInput);
    form.appendChild(nationalitySelect);
    form.appendChild(select);
    form.appendChild(btn);

    d.appendChild(title);
    d.appendChild(form);
    this.el.appendChild(d);
  }

  renderGameScreen() {
    const header = document.createElement('header');
    header.className = 'top-bar';

    const monthsPassed = 12 - engine.state.timeBudget;

    const countryFlags: Record<string, string> = {
      'USA': '🇺🇸',
      'UK': '🇬🇧',
      'Japan': '🇯🇵',
      'France': '🇫🇷',
      'Brazil': '🇧🇷'
    };
    const flag = countryFlags[engine.state.character.country] || '🏳️';

    const namePlate = document.createElement('div');
    namePlate.className = 'name-plate';

    let timeText = `(Age ${engine.state.age}, ${monthsPassed} mo)`;
    if (engine.state.currentLocation !== 'Home') {
      timeText = `(Age ${engine.state.age}) - ${engine.state.currentLocation}: ${engine.state.locationTime}h Left`;
    }

    namePlate.innerHTML = `${flag} ` + engine.state.character.firstName + ' ' + engine.state.character.lastName +
      ` <span class="text-muted" style="font-size: 0.8rem; vertical-align: middle;">${timeText}</span>`;

    const balance = document.createElement('div');
    balance.className = 'balance';
    balance.innerText = '$' + engine.state.finances.cash.toLocaleString();

    header.appendChild(namePlate);
    header.appendChild(balance);

    // Only show the progress bar when at Home
    if (engine.state.currentLocation === 'Home') {
      const timeProgressBar = document.createElement('div');
      timeProgressBar.className = 'time-progress-bar';

      const timeProgressInner = document.createElement('div');
      timeProgressInner.className = 'time-progress-inner';

      // Progress increases from 0 to 100 as timeBudget goes from 12 to 0
      const p = Math.max(0, Math.min(100, ((12 - engine.state.timeBudget) / 12) * 100));
      timeProgressInner.style.width = `${p}%`;

      timeProgressBar.appendChild(timeProgressInner);
      header.appendChild(timeProgressBar);
    }

    const main = document.createElement('main');
    main.className = 'content-area';

    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-container';

    const stats: ('health' | 'happiness' | 'smarts' | 'looks')[] = ['health', 'happiness', 'smarts', 'looks'];
    stats.forEach(stat => {
      const rawVal = engine.state.stats[stat];
      const val = Math.max(0, Math.min(100, Math.round(rawVal)));
      const row = document.createElement('div');
      row.className = 'stat-row';
      row.innerHTML = '<div class="stat-label">' + stat.substring(0, 3) + '</div>' +
        '<div class="stat-bar-outer"><div class="stat-bar-inner" data-stat="' + stat + '" style="width: ' + val + '%"></div></div>' +
        '<div class="stat-value">' + val + '%</div>';
      statsContainer.appendChild(row);
    });

    const logContainer = document.createElement('div');
    logContainer.className = 'event-log';

    for (const entry of engine.state.history) {
      const div = document.createElement('div');
      if (entry.type === 'age_up') {
        div.className = 'log-entry age-header';
        div.innerText = '— AGE ' + entry.age + ' —';
      } else {
        div.className = 'log-entry ' + entry.type;
        div.innerText = entry.text;
      }
      logContainer.appendChild(div);
    }

    const nav = document.createElement('nav');
    nav.className = 'tab-bar';

    const activitiesBtn = document.createElement('button');
    activitiesBtn.className = 'tab-btn' + (this.hasNewActivities ? ' has-new' : '');
    activitiesBtn.innerHTML = '<span class="tab-icon">⚡</span><span>Activities</span>' + (this.hasNewActivities ? '<span class="new-dot"></span>' : '');
    activitiesBtn.onclick = () => {
      this.hasNewActivities = false;
      activitiesBtn.innerHTML = '<span class="tab-icon">⚡</span><span>Activities</span>';
      this.renderActivitiesMenu();
    };

    const relsBtn = document.createElement('button');
    relsBtn.className = 'tab-btn' + (this.hasNewInteractions ? ' has-new' : '');
    relsBtn.innerHTML = '<span class="tab-icon">👥</span><span>Relations</span>' + (this.hasNewInteractions ? '<span class="new-dot"></span>' : '');
    relsBtn.onclick = () => {
      this.hasNewInteractions = false;
      relsBtn.innerHTML = '<span class="tab-icon">👥</span><span>Relations</span>';
      this.renderRelationshipsMenu();
    };

    const careerBtn = document.createElement('button');
    careerBtn.className = 'tab-btn' + (this.hasNewCareerActions ? ' has-new' : '');
    careerBtn.innerHTML = '<span class="tab-icon">💼</span><span>Career</span>' + (this.hasNewCareerActions ? '<span class="new-dot"></span>' : '');
    careerBtn.onclick = () => {
      this.hasNewCareerActions = false;
      careerBtn.innerHTML = '<span class="tab-icon">💼</span><span>Career</span>';
      this.renderCareerMenu();
    };

    const ageUpBtn = document.createElement('button');
    ageUpBtn.className = 'tab-btn';
    ageUpBtn.style.backgroundColor = 'var(--accent-color)';
    ageUpBtn.style.color = 'var(--bg-color)';
    ageUpBtn.style.fontWeight = 'bold';
    ageUpBtn.innerHTML = '<span class="tab-icon">⏳</span><span>AGE +1</span>';
    ageUpBtn.onclick = () => engine.ageUp();

    nav.appendChild(activitiesBtn);
    nav.appendChild(ageUpBtn);
    nav.appendChild(careerBtn);
    nav.appendChild(relsBtn);

    main.appendChild(logContainer);

    this.el.appendChild(header);
    this.el.appendChild(statsContainer);
    this.el.appendChild(main);
    this.el.appendChild(nav);

    main.scrollTop = main.scrollHeight;
  }

  renderEventModal(event: any) {
    const main = this.el.querySelector('.content-area') as HTMLElement;
    if (!main) return;

    const ageUpBtn = main.querySelector('.age-up-btn');
    if (ageUpBtn) ageUpBtn.remove();

    const d = document.createElement('div');
    d.className = 'event-card';

    const iconDiv = document.createElement('div');
    iconDiv.className = 'event-icon';
    iconDiv.innerText = event.icon || '❔';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'event-title';
    titleDiv.innerText = event.title;

    const descDiv = document.createElement('div');
    descDiv.className = 'event-desc';
    descDiv.innerText = event.description;

    const choicesContainer = document.createElement('div');
    choicesContainer.className = 'choices-container';

    event.choices.forEach((choice: any, index: number) => {
      const btn = document.createElement('button');
      btn.className = 'choice-card';
      btn.innerText = choice.text;
      btn.onclick = () => {
        engine.handleChoice(event, index);
        d.remove();
        this.render();
      };
      choicesContainer.appendChild(btn);
    });

    d.appendChild(iconDiv);
    d.appendChild(titleDiv);
    d.appendChild(descDiv);
    d.appendChild(choicesContainer);

    main.appendChild(d);
    main.scrollTop = main.scrollHeight;
  }

  renderActivitiesMenu() {
    const main = this.el.querySelector('.content-area') as HTMLElement;
    if (!main) return;

    const existingModal = main.querySelector('.menu-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'event-card menu-modal';

    const title = document.createElement('div');
    title.className = 'event-title';
    title.innerText = `Activities (at ${engine.state.currentLocation})`;

    const choicesContainer = document.createElement('div');
    choicesContainer.className = 'choices-container';

    const actions = getAvailableActivities(engine.state);

    if (actions.length === 0) {
      const p = document.createElement('p');
      p.innerText = 'You don\'t have enough time or money left.';
      choicesContainer.appendChild(p);
    }

    modal.appendChild(title);
    // (Time left now displayed in the global top bar)

    actions.forEach(act => {
      const btn = document.createElement('button');
      btn.className = 'choice-card';
      const costLabel = engine.state.currentLocation === 'Home' && !act.isTravel ? 'Months' : 'Time';
      btn.innerText = `${act.name} (-${act.timeCost} ${costLabel})`;
      btn.onclick = () => {
        performActivity(engine.state, act.id);
        modal.remove();
        this.render();
        // Re-open list if they still have budget
        if (engine.state.timeBudget > 0 || engine.state.locationTime > 0) this.renderActivitiesMenu();
      }
      choicesContainer.appendChild(btn);
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'choice-card text-muted';
    closeBtn.innerText = 'Close';
    closeBtn.onclick = () => modal.remove();
    choicesContainer.appendChild(closeBtn);

    modal.appendChild(choicesContainer);
    main.appendChild(modal);
    main.scrollTop = main.scrollHeight;
  }

  renderRelationshipsMenu() {
    const main = this.el.querySelector('.content-area') as HTMLElement;
    if (!main) return;

    const existingModal = main.querySelector('.menu-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'event-card menu-modal';

    const title = document.createElement('div');
    title.className = 'event-title';
    title.innerText = engine.state.career.field === 'Wrestling' ? 'People & Locker Room' : 'Relationships';

    const choicesContainer = document.createElement('div');
    choicesContainer.className = 'choices-container';

    const rels = engine.state.relationships.filter(r => r.isAlive && ((r.familiarity || 0) > 0 || r.relationshipToPlayer > 0));

    if (rels.length === 0) {
      const p = document.createElement('p');
      p.innerText = 'You do not know anyone yet.';
      choicesContainer.appendChild(p);
    }

    rels.forEach(npc => {
      const btn = document.createElement('button');
      btn.className = 'choice-card';
      btn.innerText = `${npc.name} (${npc.type}) @ ${npc.location} - Rel: ${npc.relationshipToPlayer}% | Fam: ${npc.familiarity || 0}%`;
      btn.onclick = () => this.renderNPCMenu(npc.id, modal);
      choicesContainer.appendChild(btn);
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'choice-card text-muted';
    closeBtn.innerText = 'Close';
    closeBtn.onclick = () => modal.remove();
    choicesContainer.appendChild(closeBtn);

    modal.appendChild(title);
    modal.appendChild(choicesContainer);
    main.appendChild(modal);
    main.scrollTop = main.scrollHeight;
  }

  renderCareerMenu() {
    const main = this.el.querySelector('.content-area') as HTMLElement;
    if (!main) return;

    const existingModal = main.querySelector('.menu-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'event-card menu-modal';

    const title = document.createElement('div');
    title.className = 'event-title';
    title.innerText = 'Education & Career';

    const status = document.createElement('div');
    status.className = 'event-desc';
    const educationText = engine.state.education.inProgram
      ? `${engine.state.education.programName} (Year ${engine.state.education.programYearsCompleted + 1})`
      : engine.state.education.level;
    const careerText = engine.state.career.title
      ? `${engine.state.career.title} ($${engine.state.finances.salary.toLocaleString()}/yr, Perf ${engine.state.career.performance}%)`
      : 'Unemployed';
    const barText = engine.state.flags.license_bar ? 'Licensed' : 'Not Licensed';
    const shadow = engine.state.serialKiller;
    const shadowText = shadow.unlocked
      ? `${shadow.mode} | Alias: ${shadow.alias || 'Unknown'} | Heat ${shadow.heat}% | Notoriety ${shadow.notoriety}% | Kills ${shadow.kills}`
      : 'Dormant';
    const wrestlingText = engine.state.career.field === 'Wrestling'
      ? `\nWrestling: ${String(engine.state.flags.wrestling_alignment || 'face').toUpperCase()} | Momentum ${Math.round(engine.state.flags.wrestling_momentum || 0)} | Push ${Math.round(engine.state.flags.wrestling_push || 0)} | Fanbase ${Math.round(engine.state.flags.wrestling_fan_base || 0)} | Promo ${Math.round(engine.state.flags.wrestling_promo_skill || 0)} | Injury Years ${Math.max(0, Math.floor(engine.state.flags.wrestling_injury_years || 0))}`
      : '';
    status.innerText = `Education: ${educationText} | GPA ${engine.state.education.gpa.toFixed(2)} | Bar: ${barText}\nCareer: ${careerText} | Law Exp: ${engine.state.career.lawYearsExperience}y | Licensed Exp: ${engine.state.career.licensedLawYearsExperience}y${wrestlingText}\nShadow Career: ${shadowText}`;

    const choicesContainer = document.createElement('div');
    choicesContainer.className = 'choices-container';

    const educationActions = getAvailableEducationActions(engine.state);
    const careerActions = getAvailableCareerActions(engine.state);
    const allActions = [...educationActions, ...careerActions];

    if (allActions.length === 0) {
      const p = document.createElement('p');
      p.innerText = 'No education/career actions available right now.';
      choicesContainer.appendChild(p);
    }

    educationActions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'choice-card';
      btn.innerText = `📘 ${action.name} (-${action.timeCost} Time)`;
      btn.onclick = () => {
        performEducationAction(engine.state, action.id);
        modal.remove();
        this.render();
        this.renderCareerMenu();
      };
      choicesContainer.appendChild(btn);
    });

    careerActions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'choice-card';
      btn.innerText = `💼 ${action.name} (-${action.timeCost} Time)`;
      btn.onclick = () => {
        performCareerAction(engine.state, action.id);
        modal.remove();
        this.render();
        this.renderCareerMenu();
      };
      choicesContainer.appendChild(btn);
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'choice-card text-muted';
    closeBtn.innerText = 'Close';
    closeBtn.onclick = () => modal.remove();
    choicesContainer.appendChild(closeBtn);

    modal.appendChild(title);
    modal.appendChild(status);
    modal.appendChild(choicesContainer);
    main.appendChild(modal);
    main.scrollTop = main.scrollHeight;
  }

  renderNPCMenu(npcId: string, parentModal: HTMLElement) {
    const main = this.el.querySelector('.content-area') as HTMLElement;
    if (!main) return;
    parentModal.remove();

    const existingModal = main.querySelector('.menu-modal');
    if (existingModal) existingModal.remove();

    const npc = engine.state.relationships.find(r => r.id === npcId);
    if (!npc) return;

    const modal = document.createElement('div');
    modal.className = 'event-card menu-modal';

    const title = document.createElement('div');
    title.className = 'event-title';
    title.innerText = npc.name;

    // (Time left now displayed in the global top bar)

    const choicesContainer = document.createElement('div');
    choicesContainer.className = 'choices-container';

    const actions = getAvailableInteractions(engine.state, npcId);

    if (actions.length === 0) {
      const p = document.createElement('p');
      p.innerText = 'You don\'t have enough location time or money to interact right now.';
      choicesContainer.appendChild(p);
    }

    actions.forEach(intDef => {
      const btn = document.createElement('button');
      btn.className = 'choice-card';
      const costLabel = engine.state.currentLocation === 'Home' ? 'Months' : 'Time';
      btn.innerText = `${intDef.name} (-${intDef.timeCost} ${costLabel})`;
      btn.onclick = () => {
        interactWithNPC(engine.state, npcId, intDef.id);
        modal.remove();
        this.render();
        // Re-open list if they still have budget
        if (engine.state.timeBudget > 0 || engine.state.locationTime > 0) this.renderNPCMenu(npcId, modal);
      }
      choicesContainer.appendChild(btn);
    });

    const backBtn = document.createElement('button');
    backBtn.className = 'choice-card text-muted';
    backBtn.innerText = 'Back';
    backBtn.onclick = () => {
      modal.remove();
      this.renderRelationshipsMenu();
    }
    choicesContainer.appendChild(backBtn);

    modal.appendChild(title);
    modal.appendChild(choicesContainer);
    main.appendChild(modal);
    main.scrollTop = main.scrollHeight;
  }

  renderDeathScreen() {
    this.el.innerHTML = '';
    const d = document.createElement('div');
    d.className = 'screen title-screen';

    const h1 = document.createElement('h1');
    h1.className = 'danger-color';
    h1.innerText = 'YOU DIED';

    const ageP = document.createElement('p');
    ageP.innerText = 'Age: ' + engine.state.age;

    const causeP = document.createElement('p');
    causeP.innerText = 'Cause: ' + engine.state.deathCause;

    const nwP = document.createElement('p');
    nwP.innerText = 'Net Worth: $' + engine.state.finances.cash.toLocaleString();

    const br = document.createElement('br');

    const btn = document.createElement('button');
    btn.className = 'btn-primary';
    btn.innerText = 'PLAY AGAIN';
    btn.onclick = () => location.reload();

    d.appendChild(h1);
    d.appendChild(ageP);
    d.appendChild(causeP);
    d.appendChild(nwP);
    d.appendChild(br);
    d.appendChild(btn);

    this.el.appendChild(d);
  }
}
