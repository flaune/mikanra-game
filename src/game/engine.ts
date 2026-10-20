import { nextServiceStep, guidedStep } from './cafeService';
import type { WorkMode } from './cafeService';
import { BENCHES, SERVING_VIEW, CAFE_ORIGIN, benchForStation, staffSide } from './cafeLayout';
import type { Workbench } from './cafeLayout';
import type { CafeService, ServiceAction, Station } from './cafeService';
import * as THREE from "three";
import { CharacterMotor, EYE_HEIGHT } from "./physics";
import { InteractionSystem } from "./interaction";
import type { InteractionResult } from "./interaction";
import { DialogueState, firstShiftDialogue } from "./dialogue";
import type { DialogueNode } from "./dialogue";
import type { WorldData } from "./world";
import { buildCafeStreet, STREET_SPAWN, STREET_YAW, STREET_SKY, CAFE_RETURN, INTERIOR_SPAWN } from './cafeStreet';
import { disposeScene } from './resources';
import { SimulationClock } from './simulation';
import type { Shift, Drink } from './chapterOne';
import { getCustomer, paymentFor, serviceGuide, POUR_SECONDS, PERFECT_POUR_START, PERFECT_POUR_END } from './chapterOne';
import { TrainJourney } from './trainJourney';

export interface EngineCallbacks {
  onWorkbench?: (area: Workbench | null, mode: WorkMode) => void;
  onReady: () => void;
  onLockChange: (locked: boolean) => void;
  onPlayChange?: (playing: boolean) => void;
  onLookModeChange?: (mode: 'pointer-lock' | 'mouse') => void;
  onArrival?: () => void;
  onObjective?: (objective: string) => void;
  onLocation?: (location: 'street' | 'cafe') => void;
  onLesson?: () => void;
  onNotebook?: () => void;
  onShift?: (target: string) => void;
  onService?: (action: ServiceAction) => void;
  onPrepare?: (drink: Drink, perfect?: boolean) => void;
  onWork?: (fraction: number | null) => void;
  onGuide?: (guide: { bearing: number; distance: number; route: boolean } | null) => void;
  onInteract: (result: InteractionResult | null) => void;
  onDialogue: (active: boolean) => void;
  onDialogueUpdate: (node: DialogueNode | null) => void;
  onInfo: (info: { japanese: string; romaji: string; english: string } | null) => void;
  onError: (message: string) => void;
}

const WALK_SPEED = 2.35;
const RUN_SPEED = 4.1;
const MOUSE_SENSITIVITY = 0.002;
const PITCH_LIMIT = 1.35;
// Keep smooth silhouettes on normal displays without allocating a huge 4K/HiDPI buffer.
const MAX_RENDER_PIXELS = 6_000_000;
const HANDHELD_HEIGHT = 960;

const CAFE_INTERIOR_SPAWN = INTERIOR_SPAWN;
const CAFE_EXTERIOR_RETURN = CAFE_RETURN;

export class GameEngine {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(68, 1, 0.1, 160);
  private renderer: THREE.WebGLRenderer | null = null;
  private motor: CharacterMotor | null = null;
  private interaction = new InteractionSystem(this.scene);
  private lastInteraction: InteractionResult | null = null;
  private simulation = new SimulationClock();
  private dialogue = new DialogueState();
  private inCafe = false;
  private shiftStage: string = '';
  private cafeService?: CafeService;
  private serviceElapsed = 0;
  private cafeTime = 0;
  private trayFull = false;
  private work: { id: string; elapsed: number; published: number } | null = null;
  private trayView: THREE.Group | null = null;
  private guidance: THREE.Group | null = null;
  private guideTarget = '';
  private guidePoint = new THREE.Vector3();
  private guideElapsed = 0;
  private worldData: WorldData | null = null;
  private exteriorLights: THREE.Light[] = [];

  private keys = new Set<string>();
  private position = STREET_SPAWN.clone();
  private previousPosition = STREET_SPAWN.clone();
  private yaw = STREET_YAW;
  private pitch = 0;
  private locked = false;
  private active = false;
  private infoActive = false;
  private studyActive = false;
  private handheld = false;
  private cameraMotion = false;
  private viewportSuspended = false;
  private lockPending = false;
  private releaseForWorkbench = false;
  private lockTimeout: ReturnType<typeof setTimeout> | undefined;
  private lookMode: 'pointer-lock' | 'mouse' = 'pointer-lock';
  private mousePosition: { x: number; y: number } | null = null;
  private journey: TrainJourney | null = null;
  private alive = true;
  private frameId = 0;
  private workbench: Workbench | null = null;
  private workMode: WorkMode = 'recipe';
  private benchHeld?: Station;
  private benchViewKey = '';
  private benchView?: { position: THREE.Vector3; quaternion: THREE.Quaternion };
  private shift?: Shift;
  private lastBenchAction = -Infinity;
  private lastTime: number | null = null;
  private distance = 0;
  private movementSpeed = 0;
  private bob = 0;
  private listeners = new AbortController();
  private resizeObserver: ResizeObserver;

  constructor(
    private container: HTMLElement,
    private callbacks: EngineCallbacks,
  ) {
    this.camera.rotation.order = "YXZ";
    this.scene.background = new THREE.Color(STREET_SKY);
    this.scene.fog = new THREE.Fog(STREET_SKY, 27, 68);

    const hemi = new THREE.HemisphereLight(0xe0eef6, 0x9a8876, 1.6);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffe3b8, 2.8);
    dir.position.set(-13, 18, 12);
    dir.target.position.set(0, 0, -5);
    this.scene.add(dir.target);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 60;
    dir.shadow.camera.left = -25;
    dir.shadow.camera.right = 25;
    dir.shadow.camera.top = 25;
    dir.shadow.camera.bottom = -25;
    dir.shadow.bias = -0.0005;
    dir.shadow.normalBias = .045;
    this.scene.add(dir);

    const ambient = new THREE.AmbientLight(0xfff4df, 0.2);
    this.scene.add(ambient);
    this.exteriorLights = [hemi, dir, ambient];

    this.dialogue.onStateChange = (active) => {
      this.callbacks.onDialogue(active);
      if (active) {
        this.pause();
      }
    };
    this.dialogue.onUpdate = (node) => {
      this.callbacks.onDialogueUpdate(node);
    };

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    void this.initialize();
  }

  private async initialize() {
    try {
      const motor = await CharacterMotor.create(this.position);
      if (!this.alive) { motor.dispose(); return; }
      this.motor = motor;
      await this.waitForFonts();
      if (!this.alive) return;

      this.worldData = buildCafeStreet(this.scene, this.motor, this.interaction);
      this.journey = new TrainJourney();

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(
        this.container.clientWidth,
        this.container.clientHeight,
      );
      this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      // Neutral keeps the avatar palette distinct under the café's warm lighting.
      this.renderer.toneMapping = THREE.NeutralToneMapping;
      this.renderer.toneMappingExposure = 1;
      this.renderer.domElement.style.display = "block";
      this.renderer.domElement.tabIndex = 0;
      this.renderer.domElement.style.outline = 'none';
      this.renderer.domElement.style.touchAction = 'none';
      this.renderer.domElement.setAttribute(
        "aria-label",
        "First person view of Mikanra District",
      );
      this.container.appendChild(this.renderer.domElement);

      this.resize();
      this.bind();
      if (typeof this.renderer.domElement.requestPointerLock !== 'function') {
        this.lookMode = 'mouse';
        this.callbacks.onLookModeChange?.('mouse');
      }

      this.camera.position.copy(this.position);
      this.camera.position.y += EYE_HEIGHT;
      this.camera.rotation.set(this.pitch, this.yaw, 0);

      this.callbacks.onReady();

      if (this.alive && !document.hidden && !this.viewportSuspended) {
        this.frameId = requestAnimationFrame(this.tick);
      }
    } catch (error) {
      this.fail(error, "The game could not start. Try a browser with hardware acceleration enabled.");
    }
  }

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h || !this.renderer) return;
    const nativeRatio = Math.min(window.devicePixelRatio || 1, 2);
    const budgetRatio = Math.sqrt(MAX_RENDER_PIXELS / (w * h));
    const ratio = this.handheld ? Math.min(1, HANDHELD_HEIGHT / h) : Math.min(nativeRatio, budgetRatio);
    this.renderer.setPixelRatio(ratio);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.journey?.resize(w, h);
  }

  private waitForFonts() {
    return new Promise<void>(resolve => {
      const signal = this.listeners.signal;
      const finish = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', finish);
        resolve();
      };
      const timer = setTimeout(finish, 1800);
      signal.addEventListener('abort', finish, { once: true });
      // Fonts are optional; timeout/failure uses the system fallback.
      void document.fonts.load('700 64px "Noto Sans JP"').then(finish, finish);
    });
  }

  private bind() {
    const signal = this.listeners.signal;
    const canvas = this.renderer!.domElement;
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.fail(new Error('WebGL context lost'), 'The graphics context was lost. Reload to restart.');
    }, { signal });

    this.renderer!.domElement.addEventListener("click", () => {
      if (!this.journey && !this.active && !this.dialogue.active && !this.infoActive) this.start();
    }, { signal });

    document.addEventListener(
      "mousemove",
      (e) => {
        if (!this.active || this.workbench || !this.locked || this.journey) return;
        this.yaw -= e.movementX * MOUSE_SENSITIVITY;
        this.pitch = THREE.MathUtils.clamp(
          this.pitch - e.movementY * MOUSE_SENSITIVITY,
          -PITCH_LIMIT,
          PITCH_LIMIT,
        );
      },
      { signal },
    );

    // Embedded browsers can refuse pointer lock. Ordinary mouse movement still
    // looks around there; no button or drag is required. Re-entry resets deltas.
    canvas.addEventListener('pointermove', e => {
      if (!this.active || this.workbench || this.locked || this.journey || e.pointerType === 'touch') return;
      if (this.mousePosition) {
        this.yaw -= (e.clientX - this.mousePosition.x) * MOUSE_SENSITIVITY;
        this.pitch = THREE.MathUtils.clamp(this.pitch - (e.clientY - this.mousePosition.y) * MOUSE_SENSITIVITY, -PITCH_LIMIT, PITCH_LIMIT);
      }
      this.mousePosition = { x: e.clientX, y: e.clientY };
    }, { signal });
    canvas.addEventListener('pointerleave', () => { this.mousePosition = null; }, { signal });

    document.addEventListener(
      "keydown",
      (e) => {
        if (this.viewportSuspended) return;
        if (this.journey) {
          if (e.code === 'Escape' && this.journey.arriving) { e.preventDefault(); this.finishArrival(); }
          return;
        }
        if (this.dialogue.active || this.studyActive) return;
        if (!this.active) return;
        if (this.workbench) {
          if (e.code === 'Escape') { e.preventDefault(); this.leaveWorkbench(); }
          else if (e.code === 'KeyE') { e.preventDefault(); if (!e.repeat) this.workbenchInput(true); }
          else if (e.code === 'KeyJ' && !e.repeat) { e.preventDefault(); this.openStudy(); this.callbacks.onNotebook?.(); }
          else if (['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)) e.preventDefault();
          return;
        }
        if (['Digit1','Digit2'].includes(e.code) && this.inCafe && ['brew','serve'].includes(this.shiftStage) && !e.repeat) { this.callbacks.onService?.({ type: 'portions', count: e.code === 'Digit2' ? 2 : 1 }); return; }
        if (e.code === 'KeyJ' && !e.repeat) { e.preventDefault(); this.openStudy(); this.callbacks.onNotebook?.(); return; }
        if (
          ["KeyW", "KeyA", "KeyS", "KeyD", "KeyE", "Escape", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)
        ) {
          e.preventDefault();
        }
        if (e.code === "KeyE" && !e.repeat) {
          this.keys.add('KeyE');
          this.handleInteract();
          return;
        }
        this.keys.add(e.code);
        if (e.code === "Escape") this.pause();
      },
      { signal },
    );

    document.addEventListener("keyup", (e) => {
      if (this.workbench) { if (e.code === 'KeyE') this.workbenchInput(false); return; }
      if (e.code === 'KeyE' && this.active && this.keys.has('KeyE') && this.movementSpeed <= .1 && this.cafeService && (this.cafeService.manual || this.cafeService.coffee === 'extracting') && this.interaction.update(this.camera,this.guideTarget)?.id === 'shift-'+(this.cafeService.manual?.station ?? 'coffee')) this.callbacks.onService?.({ type: 'release' });
      if (e.code === 'KeyE' && this.work && this.active) {
        const fraction = this.work.elapsed / POUR_SECONDS;
        this.camera.rotation.set(this.pitch, this.yaw, 0);
        if (fraction >= PERFECT_POUR_START && this.movementSpeed <= .1 && this.interaction.update(this.camera,this.guideTarget)?.id === this.work.id) this.finishPour(fraction <= PERFECT_POUR_END);
        else this.cancelWork();
      }
      this.keys.delete(e.code);
    }, {
      signal,
    });

    document.addEventListener(
      "pointerlockchange",
      () => {
        const wasLocked = this.locked;
        const wantsPlay = this.lockPending || this.active;
        this.locked = document.pointerLockElement === this.renderer?.domElement;
        this.lockPending = false;
        clearTimeout(this.lockTimeout);
        if (this.locked) {
          if (wantsPlay && !this.dialogue.active && !this.infoActive) this.beginPlay('pointer-lock');
          else document.exitPointerLock();
        }
        if (wasLocked && !this.locked && !this.dialogue.active && !this.workbench && !this.releaseForWorkbench) this.pause();
        if(!this.locked)this.releaseForWorkbench=false;
        this.callbacks.onLockChange(this.locked);
      },
      { signal },
    );

    document.addEventListener(
      "pointerlockerror",
      (e) => {
        this.useMouseFallback();
        e.stopImmediatePropagation();
      },
      { capture: true, signal },
    );

    document.addEventListener(
      "visibilitychange",
      () => {
        this.updateVisibility();
      },
      { signal },
    );

    window.addEventListener("blur", () => this.pause(), { signal });
  }

  private handleInteract() {
    // Recheck visibility and aim on the input event, not a stale render-frame target.
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    this.publishInteraction(this.interaction.update(this.camera,this.guideTarget));
    const result = this.interaction.trigger();
    if (!result) return;

    const target = this.interaction.currentTarget;
    if (!target) return;
    if (target.type === 'info' || target.type === 'sign') {
      this.infoActive = true;
      this.pause();
    }

    if (target.id.startsWith('shift-') && target.id !== 'shift-customer' && this.inCafe && !staffSide(this.position.z - CAFE_ORIGIN)) {
      this.callbacks.onObjective?.('Walk around the right end of the counter to reach your work area.'); return;
    }
    if (this.callbacks.onService && target.id.startsWith('shift-') && !['shift-customer','shift-register'].includes(target.id)) {
      this.enterWorkbench(target.id.slice(6)); return;
    }
    if (['shift-coffee', 'shift-tea', 'shift-water'].includes(target.id) && this.callbacks.onPrepare) {
      if (this.trayFull) { this.callbacks.onObjective?.('Your tray is full. Serve your customer or return the cups before pouring again.'); return; }
      if (['brew','serve'].includes(this.shiftStage)) { this.work = { id: target.id, elapsed: 0, published: -1 }; }
      else { this.callbacks.onObjective?.('Take an order from the customer before preparing a drink.'); }
      return;
    }
    if (target.id.startsWith('shift-') && this.callbacks.onShift) { this.openStudy(); this.callbacks.onShift(target.id); return; }
    switch (target.id) {
      case "cafe-door":
        this.enterCafe();
        break;
      case "cafe-exit":
        this.exitCafe();
        break;
      case "barista":
        if (this.callbacks.onLesson) { this.openStudy(); this.callbacks.onLesson(); break; }
        this.callbacks.onObjective?.('Your first shift · Practice a greeting with the owner');
        this.dialogue.start(firstShiftDialogue);
        break;
      case "cafe-sign":
        this.callbacks.onInfo({ japanese: "喫茶", romaji: "kissa", english: "tea / coffee service" });
        break;
      case "station-entrance":
        this.callbacks.onInfo({ japanese: "駅", romaji: "eki", english: "station" });
        break;
      case "bookstore-sign":
        this.callbacks.onInfo({ japanese: "書店", romaji: "shoten", english: "bookstore" });
        break;
      case "laundromat-sign":
        this.callbacks.onInfo({ japanese: "クリーニング", romaji: "kurīningu", english: "dry cleaning / cleaning service" });
        break;
      case 'cafe-menu':
        this.callbacks.onInfo({ japanese: 'コーヒー', romaji: 'kōhī', english: 'Coffee · 450 yen' });
        break;
      case "konbini-sign":
        this.callbacks.onInfo({ japanese: "コンビニ", romaji: "konbini", english: "convenience store" });
        break;
      case "vending-1":
        this.callbacks.onInfo({ japanese: "自販機", romaji: "jihanki", english: "vending machine" });
        break;
      default:
        break;
    }
  }

  private enterCafe() {
    if (!this.worldData) return;
    this.inCafe = true;
    this.worldData.cafeInterior.visible = true;
    this.exteriorLights.forEach(light => { light.visible = false; });
    this.callbacks.onLocation?.('cafe');
    this.motor?.teleport(CAFE_INTERIOR_SPAWN);
    this.position.copy(CAFE_INTERIOR_SPAWN);
    this.resetMovement();
    this.clearInteraction();
    this.yaw = 0;
    this.pitch = 0;
    this.callbacks.onObjective?.('Your first shift · Speak to the owner behind the counter');
  }

  private exitCafe() {
    if (!this.worldData) return;
    this.inCafe = false;
    if (this.trayView) this.trayView.visible = false;
    this.worldData.cafeInterior.visible = false;
    this.exteriorLights.forEach(light => { light.visible = true; });
    this.callbacks.onLocation?.('street');
    this.motor?.teleport(CAFE_EXTERIOR_RETURN);
    this.position.copy(CAFE_EXTERIOR_RETURN);
    this.resetMovement();
    this.clearInteraction();
    this.yaw = Math.PI;
    this.pitch = 0;
  }

  dialogueChoose(index: number) {
    const node = this.dialogue.node;
    if (!node || !node.choices) return;
    const choice = node.choices[index];
    if (choice) {
      this.dialogue.choose(choice);
      if (!this.dialogue.active) this.start();
    }
  }

  dialogueAdvance() {
    this.dialogue.advance();
    if (!this.dialogue.active) {
      this.callbacks.onObjective?.('First greeting learned · Explore the café and neighborhood');
      this.start();
    }
  }

  dismissInfo() {
    this.infoActive = false;
    this.callbacks.onInfo(null);
    this.start();
  }

  beginJourney(muted = false) {
    if (this.viewportSuspended || !this.journey || this.journey.arriving) return;
    this.journey.beginArrival(muted);
    // Request capture inside the original click, before the cinematic delay.
    this.start();
  }

  private finishArrival() {
    if (!this.journey) return;
    this.journey.dispose(); this.journey = null;
    this.mousePosition = null; this.keys.clear(); this.resetMovement();
    this.callbacks.onArrival?.();
    this.callbacks.onObjective?.('Your first shift · Find Café Mikan under the striped awning');
  }

  start() {
    if (this.workbench && !this.active && !this.studyActive && !this.viewportSuspended && !document.hidden && this.alive) {
      this.active = true; this.resetMovement(); this.callbacks.onPlayChange?.(true); return;
    }
    if (this.viewportSuspended || document.hidden || !this.renderer || !this.alive || this.active || this.lockPending || this.dialogue.active || this.infoActive || this.studyActive) return;
    this.lockPending = true;
    if (typeof this.renderer.domElement.requestPointerLock !== 'function') {
      this.useMouseFallback();
      return;
    }
    this.lockTimeout = setTimeout(() => this.useMouseFallback(), 1200);
    try {
      const lockPromise = this.renderer.domElement.requestPointerLock();
      if (lockPromise && typeof lockPromise.catch === 'function') lockPromise.catch(() => this.useMouseFallback());
    } catch { this.useMouseFallback(); }
  }

  private useMouseFallback() {
    if (!this.lockPending || !this.alive || this.dialogue.active || this.infoActive) return;
    this.beginPlay('mouse');
  }

  private beginPlay(mode: 'pointer-lock' | 'mouse') {
    clearTimeout(this.lockTimeout);
    this.lockPending = false;
    this.lookMode = mode;
    this.active = true;
    this.mousePosition = null;
    this.keys.clear();
    this.resetMovement();
    if (this.renderer) {
      this.renderer.domElement.focus({ preventScroll: true });
      this.renderer.domElement.style.cursor = mode === 'mouse' ? 'crosshair' : '';
    }
    this.callbacks.onLookModeChange?.(mode);
    this.callbacks.onPlayChange?.(true);
  }

  setViewportSuspended(suspended: boolean) {
    this.viewportSuspended = suspended;
    this.updateVisibility();
  }

  private currentBenchStep() {
    const shift=this.shift;
    return shift?.service ? guidedStep(shift.service,shift.ticket?.drink ?? getCustomer(shift).drink,shift.ticket?.count ?? getCustomer(shift).count as 1|2,shift.day,this.workMode) : null;
  }
  private enterWorkbench(station: string) {
    if (!this.shift || !this.inCafe || !staffSide(this.position.z-CAFE_ORIGIN)) return;
    this.workbench=benchForStation(station);
    this.workMode=this.shift.stage==='report'?'cleanup':['brew','serve'].includes(this.shift.stage)?'recipe':'wash';
    this.benchHeld=undefined; this.keys.clear(); this.lockPending=false; clearTimeout(this.lockTimeout);
    this.resetMovement();this.clearInteraction();this.syncWorkbenchView(true);
    if(this.trayView)this.trayView.visible=false;
    this.worldData?.equipment?.setWorkbench(true);
    if(document.pointerLockElement===this.renderer?.domElement){this.releaseForWorkbench=true;document.exitPointerLock();}
    if(this.renderer)this.renderer.domElement.style.cursor='';
  }
  private syncWorkbenchView(force=false) {
    if(!this.workbench)return;
    const step=this.currentBenchStep();
    const area=step?benchForStation(step.station):this.workbench;
    const ready=this.workMode==='recipe'&&!step;
    const viewKey=area+(ready?':tray':'');
    if(!force&&viewKey===this.benchViewKey&&this.benchView)return;
    this.benchViewKey=viewKey;
    this.workbench=area;
    const anchor=ready?SERVING_VIEW:BENCHES[area],view=new THREE.PerspectiveCamera();
    view.position.set(anchor.position[0]+CAFE_ORIGIN,anchor.position[1],anchor.position[2]+CAFE_ORIGIN);
    view.lookAt(anchor.look[0]+CAFE_ORIGIN,anchor.look[1],anchor.look[2]+CAFE_ORIGIN);
    this.benchView={position:view.position.clone(),quaternion:view.quaternion.clone()};
    this.callbacks.onWorkbench?.(area,this.workMode);
  }
  setWorkbenchMode(mode: WorkMode) {
    if(!this.workbench||!this.active)return;
    this.workbenchInput(false);this.workMode=mode;this.syncWorkbenchView(true);
  }
  workbenchInput(held: boolean, expected?: string) {
    if(!held) {
      if(this.benchHeld && this.active)this.callbacks.onService?.({type:'release'});
      this.benchHeld=undefined;return;
    }
    if(!this.workbench||!this.active||!this.shift)return;
    const step=this.currentBenchStep();
    if(!step||(expected&&expected!==step.key)||this.benchHeld)return;
    if(step.waiting){if(step.station==='coffee')this.benchHeld='coffee';return;}
    if(!step.hold&&performance.now()-this.lastBenchAction<180)return;
    this.lastBenchAction=performance.now();
    if(step.hold||(step.station==='coffee'&&this.cafeService?.coffee==='locked'))this.benchHeld=step.station;
    this.callbacks.onService?.({type:'guided',step:step.key,drink:this.shift.ticket?.drink??getCustomer(this.shift).drink,count:(this.shift.ticket?.count??getCustomer(this.shift).count) as 1|2,mode:this.workMode});
  }
  leaveWorkbench() {
    if(!this.workbench)return;
    this.workbenchInput(false);this.workbench=null;this.benchView=undefined;
    this.worldData?.equipment?.setWorkbench(false);
    this.callbacks.onWorkbench?.(null,'recipe');
    this.camera.position.copy(this.position);this.camera.position.y+=EYE_HEIGHT;this.camera.rotation.set(this.pitch,this.yaw,0);
    this.beginPlay('mouse');if(this.shift)this.setShiftPresentation(this.shift);
  }

  openStudy() { this.studyActive = true; this.pause(); }
  closeStudy() { this.studyActive = false; this.start(); }
  setShiftPresentation(shift: Shift) {
    this.shift = shift;
    this.shiftStage = shift.stage;
    this.trayFull = shift.tray.length >= 2;
    this.guideTarget = serviceGuide(shift).target;
    if (shift.service && ['brew','serve'].includes(shift.stage)) { const step = guidedStep(shift.service,shift.ticket?.drink ?? getCustomer(shift).drink,shift.ticket?.count ?? getCustomer(shift).count,shift.day); if (step) this.guideTarget = 'shift-'+step.station; }
    if (this.workbench) this.syncWorkbenchView();
    this.cafeService = shift.service;
    if (shift.service) {
      this.worldData?.equipment?.setState(shift.service);
      const task = nextServiceStep(shift.service, shift.ticket?.drink ?? 'coffee', shift.day);
      for (const target of this.worldData?.interactables ?? []) {
        if (target.id === 'shift-'+task.station) target.prompt = 'Open workbench · '+task.label;
        else if (target.id.startsWith('shift-') && !['shift-customer','shift-register'].includes(target.id)) target.prompt = 'Open workbench';
      }
    }
    if (!this.renderer) return;
    if (!this.guidance) {
      const guidance = new THREE.Group(); guidance.name = 'Next café task'; guidance.userData.blocksInteraction = false;
      const material = new THREE.MeshBasicMaterial({ color: 0x9dd576, transparent: true, opacity: .9, depthWrite: false });
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(.12, .2, 4), material); arrow.rotation.z = Math.PI; arrow.position.y = 2.12; guidance.add(arrow);
      const ring = new THREE.Mesh(new THREE.RingGeometry(.18, .22, 32), material); ring.rotation.x = -Math.PI / 2; ring.position.y = .025; guidance.add(ring);
      this.scene.add(guidance); this.guidance = guidance;
    }
    if (!this.trayView) {
      const tray = new THREE.Group(); tray.name = 'Carried serving tray'; tray.userData.blocksInteraction = false;
      const board = new THREE.Mesh(new THREE.BoxGeometry(.55, .025, .35), new THREE.MeshStandardMaterial({ color: 0x825b38, roughness: .7 })); tray.add(board);
      for (const x of [-.13, .13]) {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(.07, .05, .12, 12), new THREE.MeshStandardMaterial({ color: 0xf3dfad })); cup.position.set(x, .075, 0); tray.add(cup);
        const liquid = new THREE.Mesh(new THREE.CircleGeometry(.063, 12), new THREE.MeshStandardMaterial({ color: 0x493020 })); liquid.rotation.x = -Math.PI / 2; liquid.position.set(x, .137, 0); tray.add(liquid);
      }
      tray.position.set(.25, -.52, -.9); this.camera.add(tray); this.scene.add(this.camera); this.trayView = tray;
    }
    this.trayView.visible = !this.workbench && this.inCafe && shift.tray.length > 0 && ['brew','serve'].includes(shift.stage);
    for (let i = 1; i < this.trayView.children.length; i++) {
      this.trayView.children[i].visible = Math.ceil(i / 2) <= shift.tray.length;
      if (i % 2 === 0) { const drink = shift.tray[i / 2 - 1]; ((this.trayView.children[i] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(drink === 'coffee' ? 0x493020 : drink === 'tea' ? 0x948044 : 0x83b1bf); }
    }
    this.worldData?.customerService?.setShift(shift);
    const coins = this.worldData?.cafeInterior.getObjectByName('customer-payment');
    if (coins) coins.visible = shift.stage === 'pay' && paymentFor(shift) > 0;
  }

  resumeCafe() {
    if (this.viewportSuspended || !this.renderer || !this.alive) return;
    this.finishArrival(); this.enterCafe(); this.start();
  }
  private updateGuidance(dt: number) {
    if (!this.guidance) return;
    this.guidance.visible = !this.workbench && this.inCafe && this.active;
    if (!this.guidance.visible) return;
    const target = this.worldData?.interactables?.find(item => item.id === this.guideTarget);
    if (!target) { this.guidance.visible = false; return; }
    target.mesh.getWorldPosition(this.guidePoint);
    const needsWorkArea = this.guideTarget.startsWith('shift-') && this.guideTarget !== 'shift-customer';
    const route = needsWorkArea && this.position.z > 98.0;
    if (route) {
      // Walk around the furniture and open right end, never through the counter.
      if (this.position.z > 101.0) this.guidePoint.set(100, 0, 100.65);
      else if (this.position.x < 102.05) this.guidePoint.set(102.3, 0, 100.65);
      else this.guidePoint.set(102.3, 0, 97.65);
    }
    this.guidance.position.copy(this.guidePoint);
    this.guidance.children[0].position.y = (route ? 1.0 : 2.12) + (this.cameraMotion ? Math.sin(this.distance * 2) * .04 : 0);
    this.guidance.children[1].visible = route;
    this.guideElapsed += dt;
    if (this.guideElapsed < .15) return;
    this.guideElapsed = 0;
    const dx = this.guidePoint.x - this.position.x, dz = this.guidePoint.z - this.position.z;
    const angle = Math.atan2(dx, -dz) + this.yaw;
    this.callbacks.onGuide?.({ bearing: Math.atan2(Math.sin(angle), Math.cos(angle)) * 180 / Math.PI, distance: Math.hypot(dx, dz), route });
  }
  private cancelWork() {
    if (!this.work) return;
    this.work = null; this.callbacks.onWork?.(null);
  }
  private finishPour(perfect: boolean) {
    if (!this.work) return;
    const drink = this.work.id.slice(6) as Drink;
    this.cancelWork(); this.keys.delete('KeyE'); this.callbacks.onPrepare?.(drink, perfect);
  }
  private updateWork(dt: number, result: InteractionResult | null) {
    if (!this.work) return;
    if (!this.keys.has('KeyE') || result?.id !== this.work.id || !['brew','serve'].includes(this.shiftStage) || this.movementSpeed > .1) { this.cancelWork(); return; }
    this.work.elapsed += dt;
    const fraction = Math.min(1, this.work.elapsed / POUR_SECONDS);
    const display = Math.floor(fraction * 50) / 50;
    if (display !== this.work.published) { this.work.published = display; this.callbacks.onWork?.(display); }
    if (fraction === 1) {
      this.finishPour(false);
    }
  }
  setPresentation(graphics: 'handheld' | 'crisp', motion: boolean) {
    this.handheld = graphics === 'handheld'; this.cameraMotion = motion;
    this.resize();
  }

  private updateVisibility() {
    const hidden = document.hidden || this.viewportSuspended;
    this.journey?.setHidden(hidden);
    if (hidden) {
      this.pause();
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
      this.resetMovement();
    } else if (this.alive && this.renderer && !this.frameId) {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  pause() {
    this.cancelWork();
    this.benchHeld = undefined;
    this.active = false;
    this.lockPending = false;
    clearTimeout(this.lockTimeout);
    this.mousePosition = null;
    this.keys.clear();
    this.resetMovement();
    this.clearInteraction();
    if (this.renderer) this.renderer.domElement.style.cursor = '';
    this.callbacks.onPlayChange?.(false);
    if (document.pointerLockElement === this.renderer?.domElement) {
      document.exitPointerLock();
    }
  }

  private recoverPosition(): boolean {
    // Last-resort recovery also covers bad teleports and future collision regressions.
    const p = this.position;
    const invalid = !Number.isFinite(p.x + p.y + p.z) || p.y < -1 || p.y > 10 ||
      (this.inCafe ? p.x < 96.5 || p.x > 103.5 || p.z < 94.5 || p.z > 103.5 : p.x < -14.7 || p.x > 12.7 || p.z < -23.3 || p.z > 13.4);
    if (invalid) {
      this.position.copy(this.inCafe ? INTERIOR_SPAWN : STREET_SPAWN);
      this.motor?.teleport(this.position); this.previousPosition.copy(this.position);
      this.keys.clear(); this.clearInteraction(); this.bob = 0; this.movementSpeed = 0;
      this.callbacks.onObjective?.('Returned to a safe spot'); return true;
    }
    return false;
  }

  private walk(dt: number) {
    if (this.recoverPosition()) return;
    this.previousPosition.copy(this.position);
    this.yaw += ((this.keys.has('ArrowLeft') ? 1 : 0) - (this.keys.has('ArrowRight') ? 1 : 0)) * 1.5 * dt;
    this.pitch = THREE.MathUtils.clamp(this.pitch + ((this.keys.has('ArrowUp') ? 1 : 0) - (this.keys.has('ArrowDown') ? 1 : 0)) * 1.2 * dt, -PITCH_LIMIT, PITCH_LIMIT);
    let x =
      (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);
    let z =
      (this.keys.has("KeyS") ? 1 : 0) - (this.keys.has("KeyW") ? 1 : 0);

    const length = Math.hypot(x, z);
    if (length > 1) {
      x /= length;
      z /= length;
    }

    const running =
      this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
    const speed = running ? RUN_SPEED : WALK_SPEED;

    const dx = (x * Math.cos(this.yaw) + z * Math.sin(this.yaw)) * speed * dt;
    const dz = (-x * Math.sin(this.yaw) + z * Math.cos(this.yaw)) * speed * dt;

    const prevX = this.position.x;
    const prevZ = this.position.z;

    if (this.worldData?.customerService) this.motor?.setCustomers(this.inCafe ? this.worldData.customerService.getObstacles() : []);
    this.motor?.move(dx, dz, dt, this.position);

    if (this.recoverPosition()) return;
    const moved = Math.hypot(
      this.position.x - prevX,
      this.position.z - prevZ,
    );
    this.distance += moved;

    const grounded = this.motor?.grounded ?? false;
    this.movementSpeed = moved / dt;

    this.bob = grounded
      ? Math.sin(this.distance * 6.7) *
        Math.min(moved / Math.max(dt, 0.001), 0.7) *
        0.029
      : 0;

  }

  private present(dt: number) {
    this.camera.position.lerpVectors(this.previousPosition, this.position, this.simulation.alpha);
    this.camera.position.y += EYE_HEIGHT + (this.cameraMotion ? this.bob : 0);
    this.camera.rotation.set(this.pitch, this.yaw, 0);

    const running = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const fov = this.cameraMotion && running && this.movementSpeed > .06 ? 72 : 68;
    this.camera.fov += (fov - this.camera.fov) * Math.min(dt * 5, 1);
    this.camera.updateProjectionMatrix();
  }

  private resetMovement() {
    this.simulation.reset();
    this.previousPosition.copy(this.position);
    this.lastTime = null;
    this.movementSpeed = 0;
    this.bob = 0;
  }

  private publishInteraction(result: InteractionResult | null) {
    if (result === this.lastInteraction) return;
    this.lastInteraction = result;
    this.callbacks.onInteract(result);
  }

  private clearInteraction() {
    this.interaction.clear();
    this.publishInteraction(null);
  }

  private tick = (now: number) => {
    if (!this.alive) return;
    this.frameId = 0;

    if (document.hidden || this.viewportSuspended) {
      this.resetMovement();
      return;
    }

    const dt = Math.max(0, Math.min((now - (this.lastTime ?? now)) / 1000, .25));
    this.lastTime = now;

    try {
      if (this.journey) {
        if (this.journey.update(dt)) this.finishArrival();
      } else if (this.active) {
        if (this.workbench && this.benchView) {
          const t = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 1-Math.exp(-dt*16);
          this.camera.position.lerp(this.benchView.position,t); this.camera.quaternion.slerp(this.benchView.quaternion,t);
        } else { this.simulation.advance(dt, step => this.walk(step)); this.present(dt); }
        const result = this.workbench ? null : this.interaction.update(this.camera,this.guideTarget);
        this.publishInteraction(result);
        this.updateWork(dt, result);
        if (this.inCafe && this.cafeService && this.shiftStage !== 'done') {
          this.serviceElapsed += dt;
          if (this.serviceElapsed >= .1) {
            const held = this.workbench ? this.benchHeld : this.keys.has('KeyE') && this.movementSpeed <= .1 && result?.id.startsWith('shift-') ? result.id.slice(6) as Station : undefined;
            this.callbacks.onService?.({ type: 'tick', seconds: this.serviceElapsed, held }); this.serviceElapsed = 0;
          }
          this.worldData?.equipment?.update(dt, this.cameraMotion);
        }
      } else if (!this.dialogue.active && !this.workbench) {
        this.camera.position.copy(this.position);
        this.camera.position.y += EYE_HEIGHT;
        this.camera.rotation.set(
          this.pitch,
          this.yaw,
          0,
        );
      }

      if (!this.journey && this.inCafe && (this.active || this.studyActive)) {
        this.worldData?.customerService?.update(dt);this.cafeTime+=dt;
        const owner=this.worldData?.owner;if(owner){owner.setBlink(this.cafeTime%4.6<.14);owner.head.rotation.y=Math.sin(this.cafeTime*.65)*.045;}
      }
      if (!this.journey) this.updateGuidance(dt);
      if (this.journey) this.renderer?.render(this.journey.scene, this.journey.camera);
      else this.renderer?.render(this.scene, this.camera);
    } catch (error) {
      this.fail(error, "The game encountered an error. Reload to restart.");
      return;
    }

    if (this.alive) this.frameId = requestAnimationFrame(this.tick);
  };

  private fail(error: unknown, message: string) {
    if (!this.alive) return;
    console.error(error);
    this.pause();
    this.dispose();
    this.callbacks.onError(message);
  }

  dispose() {
    if (!this.alive) return;
    this.alive = false;
    clearTimeout(this.lockTimeout);
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.active = false;
    this.lockPending = false;
    this.keys.clear();
    this.listeners.abort();
    this.resizeObserver.disconnect();
    if (document.pointerLockElement === this.renderer?.domElement) {
      document.exitPointerLock();
    }
    this.interaction.dispose();
    this.journey?.dispose();
    this.journey = null;
    this.motor?.dispose();
    this.motor = null;
    disposeScene(this.scene);
    this.worldData = null;
    this.exteriorLights = [];
    this.lastInteraction = null;
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.renderer = null;
  }
}
