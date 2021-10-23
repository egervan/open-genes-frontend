import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { Subject } from 'rxjs';
import { ToMap } from '../../../core/utils/to-map';
import { switchMap, takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api/open-genes-api.service';
import { Genes } from '../../../core/models';
import { FilterService } from './services/filter.service';
import { FilterTypesEnum } from './services/filter-types.enum';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FileExportService } from '../../../core/services/file-export.service';
import { SafeResourceUrl } from '@angular/platform-browser';
import { SnackBarComponent } from '../snack-bar/snack-bar.component';
import { Filter } from './services/filter.model';
import { SearchMode, SearchModeEnum, Settings } from '../../../core/models/settings.model';
import { SettingsService } from '../../../core/services/settings.service';

@Component({
  selector: 'app-genes-list',
  templateUrl: './genes-list.component.html',
  styleUrls: ['./genes-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenesListComponent extends ToMap implements OnInit, OnDestroy {
  @Input() isMobile: boolean;
  @Input() showFiltersPanel: boolean;

  @Input() set setSearchMode(value: SearchMode) {
    if (value) {
      this.isGoTermsMode = value === this.searchModeEnum.searchByGoTerms;
      this.isSearchByGenesList = value === this.searchModeEnum.searchByGenesList;
      this.isGoSearchPerformed = false;
      if (!this.isGoTermsMode) {
        this.updateGeneListOnSearch('');
      } else {
        this.searchGenesByGoTerm('');
      }
    }
  }

  @Input() set searchQuery(query: string) {
    if (this.isGoTermsMode) {
      this.searchGenesByGoTerm(query !== undefined && query !== '' ? query : '');
    } else if (this.isSearchByGenesList) {
      this.searchByGenesList(query !== undefined && query !== '' ? query : '');
    } else {
      this.updateGeneListOnSearch(query !== undefined && query !== '' ? query : '');
    }
  }

  @Input() genesList: Genes[];

  @Output() loaded = new EventEmitter<boolean>();

  public searchedData: Genes[];
  public genesPerPage = 20;
  public loadedGenesQuantity = this.genesPerPage;

  public filters: Filter = this.filterService.filters;
  public filterTypes = FilterTypesEnum;

  public isTableView: boolean;
  public isSearchByGenesList: boolean;
  public isGoTermsMode: boolean;
  public isGoSearchPerformed: boolean;
  public isGoTermsModeError = false;
  public isLoading = false;

  public goModeCellData: any;
  public biologicalProcess: Map<any, any>;
  public cellularComponent: Map<any, any>;
  public molecularActivity: Map<any, any>;

  public downloadJsonLink: string | SafeResourceUrl = '#';

  private retrievedSettings: Settings;
  private searchModeEnum = SearchModeEnum;
  private subscription$ = new Subject();

  constructor(
    private readonly apiService: ApiService,
    private filterService: FilterService,
    private settingsService: SettingsService,
    private fileExportService: FileExportService,
    private cdRef: ChangeDetectorRef,
    private snackBar: MatSnackBar
  ) {
    super();
  }

  ngOnInit(): void {
    this.setInitSettings();
    this.setInitialState();
  }

  private setInitSettings(): void {
    this.retrievedSettings = this.settingsService.getSettings();
    this.isTableView = this.retrievedSettings.isTableView;
  }

  /**
   * HTTP
   */
  setInitialState(): void {
    this.searchedData = [...this.genesList];
    this.downloadSearch(this.searchedData);
    this.loaded.emit(true);
    this.cdRef.markForCheck();
  }

  public filterByFuncClusters(id: number): void {
    this.filterService.filterByFuncClusters(id);
    this.filterService
      .getByFuncClusters()
      .pipe(
        switchMap((list) => {
          if (list.length !== 0) {
            return this.apiService.getGenesByFunctionalClusters(list);
          }
        }),
        takeUntil(this.subscription$)
      )
      .subscribe(
        (genes) => {
          this.searchedData = genes;
          this.downloadSearch(this.searchedData);
          this.cdRef.markForCheck();
        },
        (error) => this.errorLogger(this, error)
      );
  }

  public filterByExpressionChange(id: number): void {
    this.filterService.filterByExpressionChange(id);
    this.filterService
      .getByExpressionChange()
      .pipe(
        switchMap((expression) => {
          if (expression) {
            return this.apiService.getGenesByExpressionChange(expression);
          }
        }),
        takeUntil(this.subscription$)
      )
      .subscribe(
        (genes) => {
          this.searchedData = genes;
          this.downloadSearch(this.searchedData);
          this.cdRef.markForCheck();
        },
        (error) => this.errorLogger(this, error)
      );
  }

  public filterBySelectionCriteria(id: string): void {
    this.filterService.filterBySelectionCriteria(id);
    // TODO: DRY
    if (id) {
      const check = [];
      this.searchedData = this.searchedData.filter((gene) => {
        for (const [key, value] of Object.entries(gene.commentCause)) {
          if (id === key) {
            check.push(id);
          }
          if (check.length !== 0) {
            return id === key;
          }
        }
      });
    }
    this.downloadSearch(this.searchedData);
    this.cdRef.markForCheck();
  }

  public filterByMethylationChange(correlation: string): void {
    this.filterService.filterByMethylationChange(correlation);
    if (name) {
      const check = [];
      this.searchedData = this.searchedData.filter((gene) => {
        Object.values(gene.methylationCorrelation).forEach((item) => {
          if (correlation === item) {
            check.push(correlation);
          }
          if (check.length !== 0) {
            return correlation === item;
          }
        });
      });
    }
    this.downloadSearch(this.searchedData);
    this.cdRef.markForCheck();
  }

  public filterByDisease(name: string): void {
    this.filterService.filterByDisease(name);
    if (name) {
      const check = [];
      this.searchedData = this.searchedData.filter((gene) => {
        for (const [key, value] of Object.entries(gene.diseases)) {
          if (name === String(value['name'])) {
            check.push(name);
          }
          if (check.length !== 0) {
            return name === String(value['name']);
          }
        }
      });
    }
    this.downloadSearch(this.searchedData);
    this.cdRef.markForCheck();
  }

  public filterByDiseaseCategories(category: string): void {
    this.filterService.filterByDiseaseCategories(category);
    if (category) {
      this.searchedData = this.searchedData.filter((gene) => {
        for (const [key, value] of Object.entries(gene.diseaseCategories)) {
          return category === key;
        }
      });
    }
  }

  /**
   * Update already loaded and then filtered data on typing
   */
  public updateGeneListOnSearch(query: string): void {
    this.searchedData = this.genesList.filter((item) => {
      const searchedText = `${item.id} ${item?.ensembl ? item.ensembl : ''}
      ${item.symbol} ${item.name} ${item.aliases.join(' ')}`;
      return searchedText.toLowerCase().includes(query);
    });
    this.snackBar.openFromComponent(SnackBarComponent, {
      data: {
        title: 'items_found',
        length: this.searchedData.length ? this.searchedData.length : 0,
      },
      duration: 600,
    });
  }

  public loadMoreGenes(): void {
    if (this.searchedData?.length >= this.loadedGenesQuantity) {
      this.loadedGenesQuantity += this.genesPerPage;
    }
  }

  // TODO: this function isn't pure
  public searchGenesByGoTerm(query: string): void {
    this.isLoading = true;
    if (query) {
      this.apiService
        .getGoTermMatchByString(query)
        .pipe(takeUntil(this.subscription$))
        .subscribe(
          (genes) => {
            this.searchedData = genes; // If nothing found, will return empty array
            this.downloadSearch(this.searchedData);
            this.isGoSearchPerformed = true;
            this.isLoading = false;

            // Map data if it's presented:
            for (const item of this.searchedData) {
              this.biologicalProcess = this.toMap(item.terms?.biological_process);
              this.cellularComponent = this.toMap(item.terms?.cellular_component);
              this.molecularActivity = this.toMap(item.terms?.molecular_activity);
            }

            const isAnyTermFound = this.biologicalProcess || this.cellularComponent || this.molecularActivity;
            this.isGoTermsModeError = !isAnyTermFound;

            this.goModeCellData = {
              biologicalProcess: this.biologicalProcess,
              cellularComponent: this.cellularComponent,
              molecularActivity: this.molecularActivity,
            };

            this.snackBar.openFromComponent(SnackBarComponent, {
              data: {
                title: 'items_found',
                length: this.searchedData ? this.searchedData.length : 0,
              },
              duration: 600,
            });

            this.cdRef.markForCheck();
          },
          (error) => this.errorLogger(this, error)
        );
    } else {
      this.isGoSearchPerformed = false;
      this.isLoading = false;
      this.cdRef.markForCheck();
    }
  }

  private searchByGenesList(query: string): void {
    if (query) {
      this.searchedData = [];
      const arrayOfWords = query
        .toLowerCase()
        .split(',')
        .map((res) => res.trim())
        .filter((res) => res);

      const uniqWords = [...new Set(arrayOfWords)];

      if (uniqWords.length !== 0) {
        uniqWords.forEach((symbol) => {
          const foundGene = this.genesList.find((gene) => symbol === gene.symbol.toLowerCase());
          if (foundGene) {
            this.searchedData.push(foundGene);
          }
        });
      }
    } else {
      this.searchedData = [...this.genesList];
    }
  }

  /**
   * View
   */
  public toggleGenesView(event: boolean) {
    this.isTableView = event;
  }

  /**
   * List for download
   */
  private downloadSearch(data: any) {
    this.downloadJsonLink = this.fileExportService.downloadJson(data);
  }

  /**
   * Filter reset
   */
  public clearFilters(filter?: FilterTypesEnum): void {
    this.filterService.clearFilters(filter ? filter : null);
    this.setInitialState();
  }

  /**
   * Sorting
   */
  public sortBy(evt: string): void {
    // TODO: use enum types here
    if (evt === this.filterTypes.name) {
      if (this.filters.byName) {
        this.reverse();
      } else {
        this.sortByName();
      }
      this.filters.byName = !this.filters.byName;
    } else {
      if (this.filters.byAge) {
        this.reverse();
      } else {
        this.sortByAge();
      }
      this.filters.byAge = !this.filters.byAge;
    }
    this.cdRef.markForCheck();
  }

  private reverse() {
    this.searchedData.reverse();
  }

  private sortByName() {
    this.searchedData.sort((a, b) => {
      const A = (a.symbol + a.name).toLowerCase();
      const B = (b.symbol + b.name).toLowerCase();
      return A > B ? 1 : A < B ? -1 : 0;
    });
  }

  private sortByAge() {
    this.searchedData.sort((a, b) => a.familyOrigin?.order - b.familyOrigin?.order);
  }

  /**
   * Error handling
   */
  private errorLogger(context: any, error: any) {
    console.warn(context, error);
  }

  ngOnDestroy(): void {
    this.subscription$.next();
    this.subscription$.complete();
  }
}
