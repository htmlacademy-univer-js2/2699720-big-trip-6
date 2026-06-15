import { render, remove, RenderPosition } from '../framework/render.js';
import TripInfo from '../view/trip-info.js';
import Sort from '../view/sort.js';
import PointList from '../view/point-list.js';
import NoPoint from '../view/no-point.js';
import Loading from '../view/loading.js';
import FailedLoad from '../view/failed-load.js';
import PointPresenter from './point.js';
import NewPointPresenter from './new-point.js';
import { FilterType, SortType, UpdateType, UserAction } from '../const.js';
import { filter } from '../utils/filter.js';
import { generateTripInfo } from '../utils/trip-info.js';
import { sortPointsByDay, sortPointsByPrice, sortPointsByTime } from '../utils/sort.js';

export default class TripPresenter {
  #tripMainContainer = null;
  #tripEventsContainer = null;
  #tripModel = null;
  #filterModel = null;
  #handleNewPointDestroy = null;
  #pointPresenter = new Map();
  #newPointPresenter = null;
  #tripInfoComponent = null;
  #pointListComponent = null;
  #sortComponent = null;
  #noPointComponent = null;
  #loadingComponent = new Loading();
  #failedLoadComponent = new FailedLoad();
  #currentSortType = SortType.DAY;
  #isActionInProgress = false;

  constructor({ tripMainContainer, tripEventsContainer, tripModel, filterModel, onNewPointDestroy }) {
    this.#tripMainContainer = tripMainContainer;
    this.#tripEventsContainer = tripEventsContainer;
    this.#tripModel = tripModel;
    this.#filterModel = filterModel;
    this.#handleNewPointDestroy = onNewPointDestroy;

    this.#tripModel.addObserver(this.#handleModelEvent);
    this.#filterModel.addObserver(this.#handleModelEvent);
  }

  init() {
    if (this.#tripModel.isLoading) {
      this.#renderLoading();
      return;
    }

    this.#renderTripInfo();
    this.#renderTripEvents();
  }

  createPoint() {
    if (this.#isActionInProgress) {
      return;
    }

    if (this.#newPointPresenter !== null) {
      return;
    }

    this.#currentSortType = SortType.DAY;
    this.#handleModeChange();

    if (this.#filterModel.filter !== FilterType.EVERYTHING) {
      this.#filterModel.setFilter(UpdateType.MAJOR, FilterType.EVERYTHING);
    }

    if (this.#pointListComponent === null) {
      this.#clearTripEvents();
      this.#renderSort();
      this.#renderPointList();
    }

    this.#newPointPresenter = new NewPointPresenter({
      pointListContainer: this.#pointListComponent.element,
      destinations: this.#tripModel.destinations,
      offers: this.#tripModel.offers,
      onDataChange: this.#handleViewAction,
      onDestroy: this.#handleNewPointFormClose,
    });
    this.#newPointPresenter.init();
  }

  #renderTripInfo() {
    remove(this.#tripInfoComponent);
    this.#tripInfoComponent = null;

    if (this.#tripModel.points.length === 0) {
      return;
    }

    const tripInfo = generateTripInfo(
      this.#tripModel.points,
      this.#tripModel.destinations,
      this.#tripModel.offers
    );

    this.#tripInfoComponent = new TripInfo({ tripInfo });
    render(this.#tripInfoComponent, this.#tripMainContainer, RenderPosition.AFTERBEGIN);
  }

  #renderSort() {
    this.#sortComponent = new Sort({
      currentSortType: this.#currentSortType,
      onSortTypeChange: this.#handleSortTypeChange,
    });
    this.#sortComponent.setSortTypeChangeHandler();

    render(this.#sortComponent, this.#tripEventsContainer);
  }

  #renderTripEvents() {
    if (this.#tripModel.isLoadFailed) {
      this.#renderFailedLoad();
      return;
    }

    const points = this.#getPoints();

    if (points.length === 0) {
      this.#renderNoPoint();
      return;
    }

    this.#renderSort();
    this.#renderPointList();
  }

  #renderLoading() {
    render(this.#loadingComponent, this.#tripEventsContainer);
  }

  #renderFailedLoad() {
    render(this.#failedLoadComponent, this.#tripEventsContainer);
  }

  #renderNoPoint() {
    this.#noPointComponent = new NoPoint({ filterType: this.#filterModel.filter });
    render(this.#noPointComponent, this.#tripEventsContainer);
  }

  #renderPointList() {
    this.#pointListComponent = new PointList();
    render(this.#pointListComponent, this.#tripEventsContainer);

    this.#getSortedPoints().forEach((point) => {
      this.#renderPoint(point, this.#pointListComponent.element);
    });
  }

  #renderPoint(point, container) {
    const pointPresenter = new PointPresenter({
      pointListContainer: container,
      destinations: this.#tripModel.destinations,
      offers: this.#tripModel.offers,
      onDataChange: this.#handleViewAction,
      onModeChange: this.#handleModeChange,
    });

    pointPresenter.init(point);
    this.#pointPresenter.set(point.id, pointPresenter);
  }

  #handleViewAction = (actionType, updateType, update) => {
    this.#isActionInProgress = true;

    switch (actionType) {
      case UserAction.UPDATE_POINT:
        return this.#tripModel.updatePoint(updateType, update)
          .finally(() => {
            this.#isActionInProgress = false;
          });
      case UserAction.ADD_POINT:
        return this.#tripModel.addPoint(updateType, update)
          .then(() => {
            this.#handleNewPointDestroy();
          })
          .finally(() => {
            this.#isActionInProgress = false;
          });
      case UserAction.DELETE_POINT:
        return this.#tripModel.deletePoint(updateType, update)
          .finally(() => {
            this.#isActionInProgress = false;
          });
    }

    this.#isActionInProgress = false;
    return Promise.resolve();
  };

  #handleModelEvent = (updateType, data) => {
    switch (updateType) {
      case UpdateType.PATCH:
        this.#pointPresenter.get(data.id).init(data);
        break;
      case UpdateType.INIT:
        this.#clearTripEvents();
        this.#renderTripInfo();
        this.#renderTripEvents();
        break;
      case UpdateType.MINOR:
        this.#clearTripEvents();
        this.#renderTripInfo();
        this.#renderTripEvents();
        break;
      case UpdateType.MAJOR:
        this.#currentSortType = SortType.DAY;
        this.#clearTripEvents();
        this.#renderTripInfo();
        this.#renderTripEvents();
        break;
    }
  };

  #handleModeChange = () => {
    if (this.#isActionInProgress) {
      return false;
    }

    this.#newPointPresenter?.destroy();
    this.#newPointPresenter = null;
    this.#pointPresenter.forEach((presenter) => presenter.resetView());

    return true;
  };

  #handleNewPointFormClose = () => {
    this.#newPointPresenter = null;
    this.#handleNewPointDestroy();

    if (this.#getPoints().length === 0) {
      this.#clearTripEvents();
      this.#renderTripEvents();
    }
  };

  #handleSortTypeChange = (sortType) => {
    if (this.#currentSortType === sortType) {
      return;
    }

    this.#handleModeChange();
    this.#currentSortType = sortType;
    this.#clearPointList();
    this.#renderPointList();
  };

  #getPoints() {
    const filterType = this.#filterModel.filter;

    return filter[filterType](this.#tripModel.points);
  }

  #getSortedPoints() {
    switch (this.#currentSortType) {
      case SortType.TIME:
        return [...this.#getPoints()].sort(sortPointsByTime);
      case SortType.PRICE:
        return [...this.#getPoints()].sort(sortPointsByPrice);
      case SortType.DAY:
        return [...this.#getPoints()].sort(sortPointsByDay);
    }

    return this.#getPoints();
  }

  #clearPointList() {
    this.#pointPresenter.forEach((presenter) => presenter.destroy());
    this.#pointPresenter.clear();
    remove(this.#pointListComponent);
    this.#pointListComponent = null;
  }

  #clearTripEvents() {
    this.#newPointPresenter?.destroy({ isSilent: true });
    this.#newPointPresenter = null;
    this.#clearPointList();
    remove(this.#sortComponent);
    remove(this.#noPointComponent);
    remove(this.#loadingComponent);
    remove(this.#failedLoadComponent);
    this.#sortComponent = null;
    this.#noPointComponent = null;
  }
}
