'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Track = require('./');

/**
 * A {@link RemoteDataTrack} represents data published to a {@link Room} by a
 * {@link RemoteParticipant}.
 * @extends Track
 * @property {boolean} isSubscribed - Whether the {@link RemoteDataTrack} is
 *   currently subscribed to
 * @property {Track.Kind} kind - "data"
 * @property {?number} maxPacketLifeTime - If non-null, this represents a time
 *   limit (in milliseconds) during which data will be transmitted or
 *   retransmitted if not acknowledged on the underlying RTCDataChannel.
 * @property {?number} maxRetransmits - If non-null, this represents the number
 *   of times the data will be retransmitted if not successfully received on the
 *   underlying RTCDataChannel.
 * @property {boolean} ordered - true if data on the {@link RemoteDataTrack} can
 *   be received out-of-order.
 * @property {boolean} reliable - This is true if both
 *   <code>maxPacketLifeTime</code> and <code>maxRetransmits</code> are set to
 *   null. In other words, if this is true, there is no bound on packet lifetime
 *   or the number of retransmits that will be attempted, ensuring "reliable"
 *   transmission.
 * @property {Track.SID} sid - The {@link RemoteDataTrack}'s SID
 * @emits RemoteDataTrack#message
 * @emits RemoteDataTrack#unsubscribed
 */

var RemoteDataTrack = function (_Track) {
  _inherits(RemoteDataTrack, _Track);

  /**
   * Construct a {@link RemoteDataTrack} from a {@link DataTrackReceiver}.
   * @param {DataTrackReceiver} dataTrackReceiver
   * @param {RemoteTrackSignaling} signaling
   * @param {{log: Log}} options
   */
  function RemoteDataTrack(dataTrackReceiver, signaling, options) {
    _classCallCheck(this, RemoteDataTrack);

    options = Object.assign({
      name: signaling.name
    }, options);

    var _this = _possibleConstructorReturn(this, (RemoteDataTrack.__proto__ || Object.getPrototypeOf(RemoteDataTrack)).call(this, dataTrackReceiver.id, 'data', options));

    var isSubscribed = signaling.isSubscribed;
    Object.defineProperties(_this, {
      _isSubscribed: {
        set: function set(_isSubscribed) {
          isSubscribed = _isSubscribed;
        },
        get: function get() {
          return isSubscribed;
        }
      },
      _signaling: {
        value: signaling
      },
      isSubscribed: {
        enumerable: true,
        get: function get() {
          return this._isSubscribed;
        }
      },
      maxPacketLifeTime: {
        enumerable: true,
        value: dataTrackReceiver.maxPacketLifeTime
      },
      maxRetransmits: {
        enumerable: true,
        value: dataTrackReceiver.maxRetransmits
      },
      ordered: {
        enumerable: true,
        value: dataTrackReceiver.ordered
      },
      reliable: {
        enumerable: true,
        value: dataTrackReceiver.maxPacketLifeTime === null && dataTrackReceiver.maxRetransmits === null
      },
      sid: {
        enumerable: true,
        value: signaling.sid
      }
    });

    dataTrackReceiver.on('message', function (data) {
      _this.emit('message', data, _this);
    });
    return _this;
  }

  /**
   * @private
   */


  _createClass(RemoteDataTrack, [{
    key: '_unsubscribe',
    value: function _unsubscribe() {
      if (this.isSubscribed) {
        this._isSubscribed = false;
        this.emit('unsubscribed', this);
      }
      return this;
    }
  }]);

  return RemoteDataTrack;
}(Track);

/**
 * A message was received over the {@link RemoteDataTrack}.
 * @event RemoteDataTrack#message
 * @param {string|ArrayBuffer} data
 * @param {RemoteDataTrack} track - The {@link RemoteDataTrack} that received
 *   the message
 */

/**
 * The {@link RemoteDataTrack} was unsubscribed from.
 * @param {RemoteDataTrack} track - The {@link RemoteDataTrack} that was
 *   unsubscribed from
 * @event RemoteDataTrack#unsubscribed
 */

module.exports = RemoteDataTrack;