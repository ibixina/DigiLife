import { engine } from '../core/Engine';
import { events } from '../core/EventBus';

export class Renderer {
  private el: HTMLElement;
  private currentScreen: string = 'TITLE';

  constructor(elementId: string) {
    this.el = document.getElementById(elementId)!;
    this.render();

    events.on('age_up', () => this.render());
    events.on('stat_changed', () => this.render());
    events.on('event_triggered', (event: any) => this.renderEventModal(event));
    events.on('death', () => {
      this.currentScreen = 'DEATH';
      this.render();
    });
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

    const lnInput = document.createElement('input');
    lnInput.type = 'text';
    lnInput.placeholder = 'Last Name';

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
      const ln = lnInput.value || 'Doe';
      const gender = select.value as any;

      engine.state.character = {
        firstName: fn,
        lastName: ln,
        gender,
        country: 'USA',
        talent: ''
      };

      engine.logHistory(0, "You were born a " + gender + " named " + fn + " " + ln + " in the USA.", 'primary');
      this.currentScreen = 'GAME';
      this.render();
    };

    form.appendChild(fnInput);
    form.appendChild(lnInput);
    form.appendChild(select);
    form.appendChild(btn);

    d.appendChild(title);
    d.appendChild(form);
    this.el.appendChild(d);
  }

  renderGameScreen() {
    const header = document.createElement('header');
    header.className = 'top-bar';

    const namePlate = document.createElement('div');
    namePlate.className = 'name-plate';
    namePlate.innerHTML = engine.state.character.firstName + ' ' + engine.state.character.lastName +
      ' <span class="text-muted">(Age ' + engine.state.age + ')</span>';

    const balance = document.createElement('div');
    balance.className = 'balance';
    balance.innerText = '$' + engine.state.finances.cash.toLocaleString();

    header.appendChild(namePlate);
    header.appendChild(balance);

    const main = document.createElement('main');
    main.className = 'content-area';

    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-container';

    const stats: ('health' | 'happiness' | 'smarts' | 'looks')[] = ['health', 'happiness', 'smarts', 'looks'];
    stats.forEach(stat => {
      const val = engine.state.stats[stat];
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

    const ageUpBtn = document.createElement('button');
    ageUpBtn.className = 'age-up-btn';
    ageUpBtn.innerText = 'AGE +1';
    ageUpBtn.onclick = () => {
      engine.ageUp();
    };

    main.appendChild(logContainer);
    main.appendChild(ageUpBtn);

    this.el.appendChild(header);
    this.el.appendChild(statsContainer);
    this.el.appendChild(main);

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
