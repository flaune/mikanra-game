export interface DialogueChoice {
  text: string;
  japaneseText: string;
  next?: DialogueNode;
  action?: string;
}

export interface DialogueNode {
  speaker: string;
  text: string;
  japaneseText: string;
  choices?: DialogueChoice[];
  next?: DialogueNode;
  action?: string;
}

export class DialogueState {
  private current: DialogueNode | null = null;
  private _active = false;
  onStateChange: ((active: boolean) => void) | null = null;
  onUpdate: ((node: DialogueNode | null) => void) | null = null;

  get active() {
    return this._active;
  }

  start(node: DialogueNode) {
    this.current = node;
    this._active = true;
    this.onStateChange?.(true);
    this.onUpdate?.(this.current);
  }

  choose(choice: DialogueChoice) {
    if (choice.action) {
      // action handled by caller via onAction callback
    }
    if (choice.next) {
      this.current = choice.next;
      this.onUpdate?.(this.current);
    } else {
      this.end();
    }
  }

  advance() {
    if (!this.current) return;
    if (this.current.next) {
      this.current = this.current.next;
      this.onUpdate?.(this.current);
    } else if (!this.current.choices) {
      this.end();
    }
  }

  end() {
    this.current = null;
    this._active = false;
    this.onStateChange?.(false);
    this.onUpdate?.(null);
  }

  get node(): DialogueNode | null {
    return this.current;
  }
}

export const cafeDialogue: DialogueNode = {
  speaker: "Barista",
  text: "Welcome!",
  japaneseText: "いらっしゃいませ！",
  choices: [
    {
      text: "Coffee, please.",
      japaneseText: "コーヒーをください。",
      action: "order-coffee",
      next: {
        speaker: "Barista",
        text: "That's 450 yen. Thank you!",
        japaneseText: "450円です。ありがとうございます！",
      },
    },
    {
      text: "Water, please.",
      japaneseText: "みずをください。",
      action: "order-water",
      next: {
        speaker: "Barista",
        text: "That's 200 yen. Thank you!",
        japaneseText: "200円です。ありがとうございます！",
      },
    },
  ],
};

export const firstShiftDialogue: DialogueNode = {
  speaker: 'Café owner',
  japaneseText: 'ようこそ！',
  text: "Welcome! You must be our new teammate. Set your bag down — let's start your first shift with a greeting.",
  next: {
    speaker: 'Café owner',
    japaneseText: 'おはようございます。',
    text: 'Ohayō gozaimasu. This means “Good morning.” We use it to greet each other at the start of work. Try saying it back.',
    choices: [{
      japaneseText: 'おはようございます。',
      text: 'Ohayō gozaimasu — Good morning.',
      next: {
        speaker: 'Café owner',
        japaneseText: 'よろしくお願いします。',
        text: 'Yoroshiku onegaishimasu — I look forward to working with you. Take a look around and make yourself at home.',
      },
    }],
  },
};
