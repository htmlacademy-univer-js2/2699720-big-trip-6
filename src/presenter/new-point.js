import { render, remove, RenderPosition } from '../framework/render.js';
import EditPoint from '../view/edit-point.js';
import { EventType, UserAction, UpdateType } from '../const.js';

function createDefaultPoint() {
  return {
    id: `point-${Date.now()}`,
    type: EventType.FLIGHT,
    destinationId: '',
    offerIds: [],
    dateFrom: '',
    dateTo: '',
    basePrice: 0,
    isFavorite: false,
  };
}

export default class NewPointPresenter {
  #pointListContainer = null;
  #destinations = [];
  #offers = [];
  #handleDataChange = null;
  #handleDestroy = null;
  #newPointComponent = null;
  #isSaving = false;

  constructor({ pointListContainer, destinations, offers, onDataChange, onDestroy }) {
    this.#pointListContainer = pointListContainer;
    this.#destinations = destinations;
    this.#offers = offers;
    this.#handleDataChange = onDataChange;
    this.#handleDestroy = onDestroy;
  }

  init() {
    if (this.#newPointComponent !== null) {
      return;
    }

    this.#newPointComponent = new EditPoint({
      point: createDefaultPoint(),
      destinations: this.#destinations,
      offers: this.#offers,
      isNew: true,
    });

    this.#newPointComponent.setFormSubmitHandler(this.#formSubmitHandler);
    this.#newPointComponent.setDeleteClickHandler(this.#deleteClickHandler);
    this.#newPointComponent.setInnerHandlers();

    render(this.#newPointComponent, this.#pointListContainer, RenderPosition.AFTERBEGIN);
    document.addEventListener('keydown', this.#escKeydownHandler);
  }

  destroy({ isSilent = false } = {}) {
    if (this.#newPointComponent === null) {
      return;
    }

    remove(this.#newPointComponent);
    this.#newPointComponent = null;
    document.removeEventListener('keydown', this.#escKeydownHandler);

    if (!isSilent) {
      this.#handleDestroy();
    }
  }

  #formSubmitHandler = (point) => {
    this.#isSaving = true;

    this.#newPointComponent.updateData({
      isSaving: true,
    });

    this.#handleDataChange(
      UserAction.ADD_POINT,
      UpdateType.MINOR,
      point
    ).catch(() => {
      this.#isSaving = false;
      this.#newPointComponent.updateData({
        isSaving: false,
      });
      this.#newPointComponent.shake();
    });
  };

  #deleteClickHandler = () => {
    if (this.#isSaving) {
      return;
    }

    this.destroy();
  };

  #escKeydownHandler = (evt) => {
    if (evt.key === 'Escape' || evt.key === 'Esc') {
      evt.preventDefault();

      if (this.#isSaving) {
        return;
      }

      this.destroy();
    }
  };
}
