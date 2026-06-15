import { render, replace, remove } from '../framework/render.js';
import Point from '../view/point.js';
import EditPoint from '../view/edit-point.js';
import { UserAction, UpdateType } from '../const.js';

const Mode = {
  DEFAULT: 'DEFAULT',
  EDITING: 'EDITING',
};

export default class PointPresenter {
  #pointListContainer = null;
  #destinations = [];
  #offers = [];
  #handleDataChange = null;
  #handleModeChange = null;
  #pointComponent = null;
  #editPointComponent = null;
  #point = null;
  #mode = Mode.DEFAULT;

  constructor({ pointListContainer, destinations, offers, onDataChange, onModeChange }) {
    this.#pointListContainer = pointListContainer;
    this.#destinations = destinations;
    this.#offers = offers;
    this.#handleDataChange = onDataChange;
    this.#handleModeChange = onModeChange;
  }

  init(point) {
    this.#point = point;

    const prevPointComponent = this.#pointComponent;
    const prevEditPointComponent = this.#editPointComponent;

    this.#pointComponent = new Point({
      point: this.#point,
      destination: this.#destinations.find((item) => item.id === this.#point.destinationId),
      offers: this.#offers.filter((offer) => this.#point.offerIds.includes(offer.id)),
    });

    this.#editPointComponent = new EditPoint({
      point: this.#point,
      destinations: this.#destinations,
      offers: this.#offers,
    });

    this.#pointComponent.setEditClickHandler(() => {
      if (this.#handleModeChange() === false) {
        return;
      }

      this.#replaceCardToForm();
    });

    this.#pointComponent.setFavoriteClickHandler(() => {
      this.#handleDataChange(
        UserAction.UPDATE_POINT,
        UpdateType.PATCH,
        {
          ...this.#point,
          isFavorite: !this.#point.isFavorite,
        }
      ).catch(() => {
        this.#pointComponent.shake();
      });
    });

    this.#editPointComponent.setFormSubmitHandler((updatedPoint) => {
      this.#editPointComponent.updateData({
        isSaving: true,
      });

      this.#handleDataChange(
        UserAction.UPDATE_POINT,
        UpdateType.MINOR,
        updatedPoint
      ).catch(() => {
        this.#editPointComponent.updateData({
          isSaving: false,
        });
        this.#editPointComponent.shake();
      });
    });

    this.#editPointComponent.setRollupClickHandler(() => {
      this.#replaceFormToCard();
    });
    this.#editPointComponent.setDeleteClickHandler((updatedPoint) => {
      this.#editPointComponent.updateData({
        isDeleting: true,
      });

      this.#handleDataChange(
        UserAction.DELETE_POINT,
        UpdateType.MINOR,
        updatedPoint
      ).catch(() => {
        this.#editPointComponent.updateData({
          isDeleting: false,
        });
        this.#editPointComponent.shake();
      });
    });
    this.#editPointComponent.setInnerHandlers();

    if (prevPointComponent === null || prevEditPointComponent === null) {
      render(this.#pointComponent, this.#pointListContainer);
      return;
    }

    if (this.#mode === Mode.DEFAULT) {
      replace(this.#pointComponent, prevPointComponent);
    }

    if (this.#mode === Mode.EDITING) {
      replace(this.#pointComponent, prevEditPointComponent);
      this.#mode = Mode.DEFAULT;
    }
  }

  resetView() {
    if (this.#mode !== Mode.DEFAULT) {
      this.#replaceFormToCard();
    }
  }

  destroy() {
    document.removeEventListener('keydown', this.#escKeydownHandler);
    remove(this.#pointComponent);
    remove(this.#editPointComponent);
  }

  #replaceCardToForm() {
    replace(this.#editPointComponent, this.#pointComponent);
    document.addEventListener('keydown', this.#escKeydownHandler);
    this.#mode = Mode.EDITING;
  }

  #replaceFormToCard() {
    this.#editPointComponent.reset(this.#point);
    replace(this.#pointComponent, this.#editPointComponent);
    document.removeEventListener('keydown', this.#escKeydownHandler);
    this.#mode = Mode.DEFAULT;
  }

  #escKeydownHandler = (evt) => {
    if (evt.key === 'Escape' || evt.key === 'Esc') {
      evt.preventDefault();
      this.#replaceFormToCard();
    }
  };
}
