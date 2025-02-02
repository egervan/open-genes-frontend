import { Injectable } from '@angular/core';
import { SearchModeEnum, Settings } from '../models/settings.model';
import { GenesListSettings } from '../../components/shared/genes-list/genes-list-settings.model';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private settings: Settings = {
    showUiHints: false,
    searchMode: SearchModeEnum.searchByGenes,
    isTableView: true,
    showCookieBanner: false, // TODO: set to "true" when main page and Genes page will be separated, too many popups
  };

  public genesListSettings: GenesListSettings = {
    // Default:
    ifShowAge: true,
    ifShowDiseases: false,
    ifShowDiseaseCategories: true,
    ifShowCriteria: false,
    ifShowAgingMechanisms: true,
    ifShowProteinClasses: true,
    ifShowExperimentsStats: false,
    ifShowTags: true,
  };

  constructor() {
    if (!localStorage.getItem('settings')) {
      localStorage.setItem('settings', JSON.stringify(this.settings));
    } else {
      this.settings = JSON.parse(localStorage.getItem('settings'));
    }

    if (!localStorage.getItem('fieldsForShow')) {
      localStorage.setItem('fieldsForShow', JSON.stringify(this.genesListSettings));
    } else {
      this.genesListSettings = JSON.parse(localStorage.getItem('fieldsForShow'));
    }
  }

  setSettings(settingKey: string, value: any): void {
    // TODO: change to enum type
    // eslint-disable-next-line no-prototype-builtins
    if (this.settings.hasOwnProperty(settingKey)) {
      this.settings[settingKey] = value;
    }

    this.settings = Object.assign({ [settingKey]: value }, this.settings);
    localStorage.setItem('settings', JSON.stringify(this.settings));
  }

  getSettings(): Settings {
    return JSON.parse(localStorage.getItem('settings'));
  }

  setFieldsForShow(fields: GenesListSettings): void {
    localStorage.setItem('fieldsForShow', JSON.stringify(fields));
  }

  getFieldsForShow(): GenesListSettings {
    return JSON.parse(localStorage.getItem('fieldsForShow'));
  }
}
