import AbstractStatefulView from '../framework/view/abstract-stateful-view.js';
import { EVENT_TYPES } from '../const.js';
import { formatEditDate } from '../utils/point.js';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

const DATE_PICKER_FORMAT = 'd/m/y H:i';

function getDatePickerDate(date) {
  return date ? new Date(date) : null;
}

function getResetButtonText({ isDeleting, isNew }) {
  if (isDeleting) {
    return 'Deleting...';
  }

  return isNew ? 'Cancel' : 'Delete';
}

const DEFAULT_POINT = {
  id: 'new-point',
  type: 'flight',
  destinationId: '',
  offerIds: [],
  dateFrom: '',
  dateTo: '',
  basePrice: '',
  isDeleting: false,
  isSaving: false,
};

export default class EditPoint extends AbstractStatefulView {
  #destinations = [];
  #offers = [];
  #isNew = false;
  #handleFormSubmit = null;
  #handleRollupClick = null;
  #handleDeleteClick = null;
  #datePickerFrom = null;
  #datePickerTo = null;

  constructor({ point = DEFAULT_POINT, destinations = [], offers = [], isNew = false } = {}) {
    super();
    this._state = EditPoint.parsePointToState(point);
    this.#destinations = destinations;
    this.#offers = offers;
    this.#isNew = isNew;
  }

  #renderTypeItems() {
    const { id, type } = this._state;

    return EVENT_TYPES.map((t) => `
      <div class="event__type-item">
        <input id="event-type-${t}-${id}" class="event__type-input  visually-hidden" type="radio" name="event-type" value="${t}"${t === type ? ' checked' : ''}>
        <label class="event__type-label  event__type-label--${t}" for="event-type-${t}-${id}">${t.charAt(0).toUpperCase() + t.slice(1)}</label>
      </div>
    `).join('');
  }

  #renderDestinationOptions() {
    return this.#destinations.map(({ name }) => `<option value="${name}"></option>`).join('');
  }

  #renderOffers() {
    const offersByType = this.#offers.filter((offer) => offer.type === this._state.type);

    if (!offersByType.length) {
      return '';
    }

    const items = offersByType.map(({ id, title, price }) => `
      <div class="event__offer-selector">
        <input class="event__offer-checkbox  visually-hidden" id="event-offer-${id}" type="checkbox" name="event-offer-${id}" value="${id}"${this._state.offerIds.includes(id) ? ' checked' : ''}${this._state.isSaving || this._state.isDeleting ? ' disabled' : ''}>
        <label class="event__offer-label" for="event-offer-${id}">
          <span class="event__offer-title">${title}</span>
          &plus;&euro;&nbsp;
          <span class="event__offer-price">${price}</span>
        </label>
      </div>
    `).join('');

    return `
      <section class="event__section  event__section--offers">
        <h3 class="event__section-title  event__section-title--offers">Offers</h3>
        <div class="event__available-offers">
          ${items}
        </div>
      </section>
    `;
  }

  #renderDestinationDetails() {
    const destination = this.#destinations.find((item) => item.id === this._state.destinationId);

    if (!destination || (!destination.description && !destination.pictures.length)) {
      return '';
    }

    const photosHtml = destination.pictures.length ? `
      <div class="event__photos-container">
        <div class="event__photos-tape">
          ${destination.pictures.map(({ src, description }) => `<img class="event__photo" src="${src}" alt="${description}">`).join('')}
        </div>
      </div>
    ` : '';

    return `
      <section class="event__section  event__section--destination">
        <h3 class="event__section-title  event__section-title--destination">Destination</h3>
        ${destination.description ? `<p class="event__destination-description">${destination.description}</p>` : ''}
        ${photosHtml}
      </section>
    `;
  }

  #renderDetails() {
    const offersHtml = this.#renderOffers();
    const destinationHtml = this.#renderDestinationDetails();
    if (!offersHtml && !destinationHtml) {
      return '';
    }
    return `
      <section class="event__details">
        ${offersHtml}
        ${destinationHtml}
      </section>
    `;
  }

  get template() {
    const { id, type, destinationId, dateFrom, dateTo, basePrice, isDeleting, isSaving } = this._state;
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    const destination = this.#destinations.find((item) => item.id === destinationId);
    const resetLabel = getResetButtonText({ isDeleting, isNew: this.#isNew });
    const saveLabel = isSaving ? 'Saving...' : 'Save';
    const isDisabled = isDeleting || isSaving;
    const destinationName = destination ? destination.name : '';
    const startTime = dateFrom ? formatEditDate(dateFrom) : '';
    const endTime = dateTo ? formatEditDate(dateTo) : '';

    return `
      <li class="trip-events__item">
        <form class="event event--edit" action="#" method="post">
          <header class="event__header">
            <div class="event__type-wrapper">
              <label class="event__type  event__type-btn" for="event-type-toggle-${id}">
                <span class="visually-hidden">Choose event type</span>
                <img class="event__type-icon" width="17" height="17" src="img/icons/${type}.png" alt="Event type icon">
              </label>
              <input class="event__type-toggle  visually-hidden" id="event-type-toggle-${id}" type="checkbox"${isDisabled ? ' disabled' : ''}>

              <div class="event__type-list">
                <fieldset class="event__type-group"${isDisabled ? ' disabled' : ''}>
                  <legend class="visually-hidden">Event type</legend>
                  ${this.#renderTypeItems()}
                </fieldset>
              </div>
            </div>

            <div class="event__field-group  event__field-group--destination">
              <label class="event__label  event__type-output" for="event-destination-${id}">
                ${typeLabel}
              </label>
              <input class="event__input  event__input--destination" id="event-destination-${id}" type="text" name="event-destination" value="${destinationName}" list="destination-list-${id}" required${isDisabled ? ' disabled' : ''}>
              <datalist id="destination-list-${id}">
                ${this.#renderDestinationOptions()}
              </datalist>
            </div>

            <div class="event__field-group  event__field-group--time">
              <label class="visually-hidden" for="event-start-time-${id}">From</label>
              <input class="event__input  event__input--time" id="event-start-time-${id}" type="text" name="event-start-time" value="${startTime}"${isDisabled ? ' disabled' : ''}>
              &mdash;
              <label class="visually-hidden" for="event-end-time-${id}">To</label>
              <input class="event__input  event__input--time" id="event-end-time-${id}" type="text" name="event-end-time" value="${endTime}"${isDisabled ? ' disabled' : ''}>
            </div>

            <div class="event__field-group  event__field-group--price">
              <label class="event__label" for="event-price-${id}">
                <span class="visually-hidden">Price</span>
                &euro;
              </label>
              <input class="event__input  event__input--price" id="event-price-${id}" type="number" name="event-price" min="0" value="${basePrice}" required${isDisabled ? ' disabled' : ''}>
            </div>

            <button class="event__save-btn  btn  btn--blue" type="submit"${isDisabled ? ' disabled' : ''}>${saveLabel}</button>
            <button class="event__reset-btn" type="reset">${resetLabel}</button>
            ${!this.#isNew ? `
            <button class="event__rollup-btn" type="button">
              <span class="visually-hidden">Open event</span>
            </button>` : ''}
          </header>
          ${this.#renderDetails()}
        </form>
      </li>
    `;
  }

  setFormSubmitHandler(callback) {
    this.#handleFormSubmit = callback;
    this.element.querySelector('form').addEventListener('submit', this.#formSubmitHandler);
  }

  setRollupClickHandler(callback) {
    this.#handleRollupClick = callback;

    if (!this.#isNew) {
      this.element.querySelector('.event__rollup-btn').addEventListener('click', this.#rollupClickHandler);
    }
  }

  setDeleteClickHandler(callback) {
    this.#handleDeleteClick = callback;
    this.element.querySelector('.event__reset-btn').addEventListener('click', this.#deleteClickHandler);
  }

  setInnerHandlers() {
    this.#setInnerHandlers();
  }

  updateData(update) {
    this.#destroyDatePickers();
    this.updateElement(update);
  }

  reset(point) {
    this.#destroyDatePickers();
    this._state = EditPoint.parsePointToState(point);
    this.updateElement(this._state);
  }

  _restoreHandlers() {
    this.setFormSubmitHandler(this.#handleFormSubmit);
    this.setRollupClickHandler(this.#handleRollupClick);
    this.setDeleteClickHandler(this.#handleDeleteClick);
    this.#setInnerHandlers();
  }

  #setInnerHandlers() {
    this.element.querySelector('.event__type-group').addEventListener('change', this.#typeChangeHandler);
    this.element.querySelector('.event__input--destination').addEventListener('change', this.#destinationChangeHandler);
    this.element.querySelector('.event__input--price').addEventListener('input', this.#priceInputHandler);
    this.#setDatePickers();

    const offersContainer = this.element.querySelector('.event__available-offers');

    if (offersContainer) {
      offersContainer.addEventListener('change', this.#offerChangeHandler);
    }
  }

  #formSubmitHandler = (evt) => {
    evt.preventDefault();

    if (this.#isDisabled()) {
      return;
    }

    if (!this.#isValid()) {
      return;
    }

    this.#destroyDatePickers();
    this.#handleFormSubmit(EditPoint.parseStateToPoint(this._state));
  };

  #rollupClickHandler = (evt) => {
    evt.preventDefault();

    if (this.#isDisabled()) {
      return;
    }

    this.#handleRollupClick();
  };

  #deleteClickHandler = (evt) => {
    evt.preventDefault();

    if (this.#isDisabled()) {
      return;
    }

    this.#destroyDatePickers();
    this.#handleDeleteClick(EditPoint.parseStateToPoint(this._state));
  };

  #typeChangeHandler = (evt) => {
    evt.preventDefault();

    if (!EVENT_TYPES.includes(evt.target.value)) {
      return;
    }

    this.#destroyDatePickers();
    this.updateElement({
      type: evt.target.value,
      offerIds: [],
    });
  };

  #destinationChangeHandler = (evt) => {
    evt.preventDefault();

    const selectedDestination = this.#destinations.find(({ name }) => name === evt.target.value);

    if (!selectedDestination) {
      const currentDestination = this.#destinations.find(({ id }) => id === this._state.destinationId);
      evt.target.value = currentDestination ? currentDestination.name : '';
      return;
    }

    this.#destroyDatePickers();
    this.updateElement({
      destinationId: selectedDestination.id,
    });
  };

  #offerChangeHandler = (evt) => {
    evt.preventDefault();

    const selectedOffers = Array.from(this.element.querySelectorAll('.event__offer-checkbox:checked'))
      .map((offer) => offer.value);

    this._setState({
      offerIds: selectedOffers,
    });
  };

  #priceInputHandler = (evt) => {
    evt.target.value = evt.target.value.replace(/\D/g, '');

    this._setState({
      basePrice: evt.target.value === '' ? '' : Number(evt.target.value),
    });
  };

  static parsePointToState(point) {
    return {
      ...point,
      offerIds: [...point.offerIds],
    };
  }

  static parseStateToPoint(state) {
    const point = { ...state };

    delete point.isDeleting;
    delete point.isSaving;

    return point;
  }

  #setDatePickers() {
    this.#datePickerFrom = flatpickr(
      this.element.querySelector('[name="event-start-time"]'),
      {
        enableTime: true,
        dateFormat: DATE_PICKER_FORMAT,
        defaultDate: getDatePickerDate(this._state.dateFrom),
        maxDate: getDatePickerDate(this._state.dateTo),
        // eslint-disable-next-line camelcase
        time_24hr: true,
        onChange: this.#dateFromChangeHandler,
      },
    );

    this.#datePickerTo = flatpickr(
      this.element.querySelector('[name="event-end-time"]'),
      {
        enableTime: true,
        dateFormat: DATE_PICKER_FORMAT,
        defaultDate: getDatePickerDate(this._state.dateTo),
        minDate: getDatePickerDate(this._state.dateFrom),
        // eslint-disable-next-line camelcase
        time_24hr: true,
        onChange: this.#dateToChangeHandler,
      },
    );
  }

  #destroyDatePickers() {
    if (this.#datePickerFrom) {
      this.#datePickerFrom.destroy();
      this.#datePickerFrom = null;
    }

    if (this.#datePickerTo) {
      this.#datePickerTo.destroy();
      this.#datePickerTo = null;
    }
  }

  #dateFromChangeHandler = ([userDate]) => {
    if (!userDate) {
      return;
    }

    this._setState({
      dateFrom: userDate.toISOString(),
    });

    this.#datePickerTo.set('minDate', userDate);
  };

  #dateToChangeHandler = ([userDate]) => {
    if (!userDate) {
      return;
    }

    this._setState({
      dateTo: userDate.toISOString(),
    });

    this.#datePickerFrom.set('maxDate', userDate);
  };

  #isValid() {
    const destinationInput = this.element.querySelector('.event__input--destination');
    const selectedDestination = this.#destinations.find(({ name }) => name === destinationInput.value);

    return Boolean(selectedDestination && this._state.dateFrom && this._state.dateTo && this._state.basePrice !== '');
  }

  #isDisabled() {
    return this._state.isSaving || this._state.isDeleting;
  }
}
