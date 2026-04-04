import { AlapUI, defineAlapLink, registerConfig } from 'alap';
import { sandboxConfig } from '../shared/config';

const ui = new AlapUI(sandboxConfig);

defineAlapLink();
registerConfig(sandboxConfig);

(window as any).alapUI = ui;
