import Observable from '../framework/observable.js';
import { UpdateType } from '../const.js';

const MIN_LOADING_TIME = 100;

export default class TripModel extends Observable {
  #tripApiService = null;
  #points = [];
  #destinations = [];
  #offers = [];
  #isLoading = true;
  #isLoadFailed = false;

  constructor({ tripApiService }) {
    super();
    this.#tripApiService = tripApiService;
  }

  get points() {
    return this.#points;
  }

  get destinations() {
    return this.#destinations;
  }

  get offers() {
    return this.#offers;
  }

  get isLoading() {
    return this.#isLoading;
  }

  get isLoadFailed() {
    return this.#isLoadFailed;
  }

  async init() {
    try {
      const [points, destinations, offers] = await Promise.all([
        this.#tripApiService.points,
        this.#tripApiService.destinations,
        this.#tripApiService.offers,
        new Promise((resolve) => setTimeout(resolve, MIN_LOADING_TIME)),
      ]);

      this.#points = points;
      this.#destinations = destinations;
      this.#offers = offers;
      this.#isLoadFailed = false;
    } catch {
      this.#points = [];
      this.#destinations = [];
      this.#offers = [];
      this.#isLoadFailed = true;
    }

    this.#isLoading = false;
    this._notify(UpdateType.INIT);
  }

  setPoints(updateType, points) {
    this.#points = points;
    this._notify(updateType, points);
  }

  async updatePoint(updateType, update) {
    const updatedPoint = await this.#tripApiService.updatePoint(update);

    this.#points = this.#points.map((point) => point.id === updatedPoint.id ? updatedPoint : point);
    this._notify(updateType, updatedPoint);
  }

  async addPoint(updateType, update) {
    const newPoint = await this.#tripApiService.addPoint(update);

    this.#points = [
      newPoint,
      ...this.#points,
    ];
    this._notify(updateType, newPoint);
  }

  async deletePoint(updateType, update) {
    await this.#tripApiService.deletePoint(update);

    this.#points = this.#points.filter((point) => point.id !== update.id);
    this._notify(updateType);
  }
}
