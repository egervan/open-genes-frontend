import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { GenesListSettings } from '../../genes-list-settings.model';
import { GenesFilterService } from '../../../../../core/services/filters/genes-filter.service';
import { map, takeUntil } from 'rxjs/operators';
import { Observable, Subject } from 'rxjs';
import { SettingsService } from '../../../../../core/services/settings.service';
import { ApiService } from '../../../../../core/services/api/open-genes-api.service';
import { FormControl, FormGroup } from '@angular/forms';
import { ApiGeneSearchParameters } from '../../../../../core/models/filters/filter.model';
import { MatSelectChange } from '@angular/material/select';
import { ApiGeneSearchFilter } from '../../../../../core/models/filters/filter.model';
import { MatCheckboxChange } from '@angular/material/checkbox';

@Component({
  selector: 'app-gene-filters-panel',
  templateUrl: './gene-filters-panel.component.html',
  styleUrls: ['./gene-filters-panel.component.scss'],
})
export class GeneFiltersPanelComponent implements OnInit, OnDestroy {
  private subscription$ = new Subject();
  public filtersForm: FormGroup;

  // FIELDS VISIBILITY
  public listSettings: GenesListSettings;
  // FILTERS
  // Search in selects
  searchText: any;

  // Diseases
  public diseases: Map<number, any> = new Map();
  private cachedDisease: Map<number, any> = new Map();
  public predefinedDiseases: any[] = [];
  public diseasesModel: Observable<any[]>;
  // Disease categories
  public diseaseCategories: Map<number, any> = new Map();
  public predefinedDiseaseCategories: any[] = [];
  public diseaseCategoriesModel: Observable<any[]>;
  // Selection criteria
  public selectionCriteria: any[] = [];
  public predefinedSelectionCriteria: any[] = [];
  public selectionCriteriaModel: Observable<any[]>;
  // Aging mechanisms
  public agingMechanisms: any[] = [];
  public predefinedAgingMechanisms: any[] = [];
  private agingMechanismsModel: Observable<any[]>;
  // Protein classes
  public proteinClasses: any[] = [];
  public predefinedProteinClasses: any[] = [];
  private proteinClassesModel: Observable<any[]>;

  // Phylum
  public phylum: any[] = [];
  private phylumModel: Observable<any[]>;
  public predefinedOrigin: any[] = [];
  public predefinedFamilyOrigin: any[] = [];
  public predefinedConservativeIn: any[] = [];

  @Output() showSkeletonChange: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() filterLoaded: EventEmitter<string> = new EventEmitter<string>();

  constructor(
    private apiService: ApiService,
    private filterService: GenesFilterService,
    private settingsService: SettingsService
  ) {
    this.filtersForm = new FormGroup({
      ageRelatedProcessesSearchInput: new FormControl([[], null]),
      ageRelatedProcessesSelect: new FormControl([[], [null]]),
      diseasesSelect: new FormControl([[], [null]]),
      diseaseCategoriesSelect: new FormControl([[], [null]]),
      selectionCriteriaSelect: new FormControl([[], [null]]),
      agingMechanismsSelect: new FormControl([[], [null]]),
      proteinClassesSelect: new FormControl([[], [null]]),
      originSelect: new FormControl([[], [null]]),
      familyOriginSelect: new FormControl([[], [null]]),
      conservativeInSelect: new FormControl([[], [null]]),
      experimentsStatsCheckbox: new FormControl([false, [null]]),
    });
  }

  ngOnInit() {
    this.updateVisibleFields();

    // FILTERS
    // Diseases
    this.diseasesModel = this.getEntitiesList('diseases');
    this.diseasesModel.pipe(takeUntil(this.subscription$)).subscribe((data: any[]) => {
      // TODO: В этом эндпоинте должен отдаваться массив объектов
      for (const [key, value] of Object.entries(data)) {
        // TODO: remove this check when backend will be fixed up
        if (value['name']) {
          this.diseases.set(+key, value);
          this.cachedDisease.set(+key, value);
        }
      }
    });

    // Disease categories
    this.diseaseCategoriesModel = this.getEntitiesList('disease-categories');
    this.diseaseCategoriesModel.pipe(takeUntil(this.subscription$)).subscribe((data: any[]) => {
      // TODO: В этом эндпоинте должен отдаваться массив объектов
      for (const [key, value] of Object.entries(data)) {
        // TODO: remove this check when backend will be fixed up
        if (value['icdCode'].length !== 0) {
          this.diseaseCategories.set(+key, value);
        }
      }
    });

    // Selection criteria
    this.selectionCriteriaModel = this.getEntitiesList('criteria');
    this.selectionCriteriaModel.pipe(takeUntil(this.subscription$)).subscribe((data: any[]) => {
      this.selectionCriteria = data;
    });

    // Aging mechanisms
    this.agingMechanismsModel = this.getEntitiesList('mechanisms');
    this.agingMechanismsModel.pipe(takeUntil(this.subscription$)).subscribe((data: any[]) => {
      this.agingMechanisms = data;
    });

    // Protein classes
    this.proteinClassesModel = this.getEntitiesList('classes');
    this.proteinClassesModel.pipe(takeUntil(this.subscription$)).subscribe((data: any[]) => {
      this.proteinClasses = data;
    });

    // Gene origin and homology
    this.phylumModel = this.getEntitiesList('phylum');
    this.phylumModel
      .pipe(
        map((data: any) => data.sort((a, b) => a.order - b.order)),
        takeUntil(this.subscription$)
      )
      .subscribe((data: any[]) => {
        this.phylum = data;
      });

    // Set the values tha user has already selected in the genes list
    this.getState();
  }

  private getState(): void {
    this.filterService
      .getFilterState()
      .pipe(takeUntil(this.subscription$))
      .subscribe((data: ApiGeneSearchFilter) => {
        this.predefinedDiseases = data.byDiseases;
        this.predefinedDiseaseCategories = data.byDiseaseCategories;
        this.predefinedSelectionCriteria = data.bySelectionCriteria;
        this.predefinedAgingMechanisms = data.byAgingMechanism;
        this.predefinedProteinClasses = data.byProteinClass;
        this.predefinedOrigin = data.byOrigin;
        this.predefinedFamilyOrigin = data.byFamilyOrigin;
        this.predefinedConservativeIn = data.byConservativeIn;
        this.showSkeletonChange.emit(false);
        this.listSettings.ifShowExperimentsStats = !!data.researches;
      });
  }

  ngOnDestroy(): void {
    this.subscription$.complete();
  }

  /**
   * Check if values being passed into a select control exist in options array
   */

  compareSelectValues(value1: any, value2: any): boolean {
    if (value1 && value2) {
      return value1 === value2;
    }
    return false;
  }

  /**
   * Get entities for filters lists
   */

  private getEntitiesList(key): Observable<any[]> {
    this.filterLoaded.emit(key);
    switch (key) {
      case 'mechanisms':
        return this.apiService.getAgingMechanisms();
      case 'criteria':
        return this.apiService.getSelectionCriteria();
      case 'diseases':
        return this.apiService.getDiseases();
      // TODO: diseases have a different structure than other entities
      case 'disease-categories':
        return this.apiService.getDiseaseCategories();
      case 'classes':
        return this.apiService.getProteinClasses();
      case 'phylum':
        return this.apiService.getPhylum();
      default:
        return;
    }
  }

  public apply(filterType: ApiGeneSearchParameters, $event: MatSelectChange | MatCheckboxChange): void {
    let value;
    if ($event instanceof MatCheckboxChange) {
      value = $event.checked;
    } else if ($event instanceof MatSelectChange) {
      value = $event.value;
    }
    this.filterService.clearFilters(filterType);

    // Check if event is emitted on select change
    if (Array.isArray(value) && value.length === 0) {
      return;
    }

    // If value is emitted when user clicks empty option which is "Not selected"
    // There is no id 0, so we don't send this value
    if (Number(value) === 0) {
      return;
    }

    this.showSkeletonChange.emit(true);
    this.filterService.applyFilter(filterType, value);
    this.getState();
  }

  public toggleSwitchAndFilter(filterType: ApiGeneSearchParameters, $event): void {
    this.listSettings.ifShowExperimentsStats = $event.checked;
    this.filterService.applyFilter(filterType, Number(this.listSettings.ifShowExperimentsStats));
    this.getState();
  }

  public filterDiseases(event: KeyboardEvent): void {
    const searchText = (event.target as HTMLInputElement).value.toLowerCase();
    this.diseases = new Map(
      [...this.cachedDisease].filter(([key, value]) => value.name.toLowerCase().includes(searchText))
    );
    event.stopPropagation();
  }

  public resetForm(formControlName: string = null): void {
    if (formControlName) {
      switch (formControlName) {
        case 'diseasesSelect':
          this.filterService.clearFilters('byDiseases');
          break;
        case 'diseaseCategoriesSelect':
          this.filterService.clearFilters('byDiseaseCategories');
          break;
        case 'selectionCriteriaSelect':
          this.filterService.clearFilters('bySelectionCriteria');
          break;
        case 'agingMechanismsSelect':
          this.filterService.clearFilters('byAgingMechanism');
          break;
        case 'proteinClassesSelect':
          this.filterService.clearFilters('byProteinClass');
          break;
        case 'originSelect':
          this.filterService.clearFilters('byOrigin');
          break;
        case 'familyOriginSelect':
          this.filterService.clearFilters('byFamilyOrigin');
          break;
        case 'conservativeInSelect':
          this.filterService.clearFilters('byConservativeIn');
          break;
      }
    } else {
      this.filtersForm.reset();
      this.filterService.clearFilters();
    }
  }

  /**
   * Update list view
   */

  private updateVisibleFields(): void {
    this.filterService.currentFields.pipe(takeUntil(this.subscription$)).subscribe(
      (fields) => {
        this.settingsService.setFieldsForShow(fields);
        this.listSettings = fields;
      },
      (error) => {
        console.warn(error);
      }
    );
  }

  /**
   * List view settings
   */

  // eslint-disable-next-line @typescript-eslint/ban-types
  public toggleGenesListSettings(param: string, callback?: void | ((...args: any[]) => void)): void {
    switch (param) {
      case 'gene-age':
        this.listSettings.ifShowAge = !this.listSettings.ifShowAge;
        break;
      case 'diseases':
        this.listSettings.ifShowDiseases = !this.listSettings.ifShowDiseases;
        break;
      case 'disease-categories':
        this.listSettings.ifShowDiseaseCategories = !this.listSettings.ifShowDiseaseCategories;
        break;
      case 'criteria':
        this.listSettings.ifShowCriteria = !this.listSettings.ifShowCriteria;
        break;
      case 'mechanisms':
        this.listSettings.ifShowAgingMechanisms = !this.listSettings.ifShowAgingMechanisms;
        break;
      case 'classes':
        this.listSettings.ifShowProteinClasses = !this.listSettings.ifShowProteinClasses;
        break;
      default:
        break;
    }
    this.filterService.updateFields(this.listSettings);

    if (callback instanceof Function) {
      callback(...callback.arguments);
    }
  }
}
