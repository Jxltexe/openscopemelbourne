import _forEach from 'lodash/forEach';
import _get from 'lodash/get';
import _map from 'lodash/map';
import _isArray from 'lodash/isArray';
import _isEmpty from 'lodash/isEmpty';
import _isObject from 'lodash/isObject';
import _random from 'lodash/random';
import _round from 'lodash/round';
import BaseModel from '../base/BaseModel';
import RouteModel from '../navigationLibrary/Route/RouteModel';
import { spawnPatternModelJsonValidator } from './spawnPatternModelJsonValidator';
import { buildPreSpawnAircraft } from './buildPreSpawnAircraft';
import { routeStringFormatHelper } from '../navigationLibrary/Route/routeStringFormatHelper';
import { bearingToPoint } from '../math/flightMath';
import { tau } from '../math/circle';
import { convertMinutesToSeconds } from '../utilities/unitConverters';
import { AIRPORT_CONSTANTS } from '../constants/airportConstants';
import { FLIGHT_CATEGORY } from '../constants/aircraftConstants';
import { TIME } from '../constants/globalConstants';

// TODO: this may need to live somewhere else
/**
 * @property SPAWN_METHOD
 * @type {Object}
 * @final
 */
const SPAWN_METHOD = {
    RANDOM: 'random',
    CYCLIC: 'cyclic',
    SURGE: 'surge',
    WAVE: 'wave'
};

/**
 * Defines a spawn pattern for a specific route within the area
 *
 * This can be for departures or arrivals. Provides a starting point and definition
 * for all spawning aircraft
 *
 * @class SpawnPatternModel
 * @extends BaseModel
 */
export default class SpawnPatternModel extends BaseModel {
    /**
     * @constructor
     * @for SpawnPatternModel
     * @param spawnPatternJson {object}
     * @param navigationLibrary {NavigationLibrary}
     * @param airportController {AirportController}
     */
    // istanbul ignore next
    constructor(spawnPatternJson, navigationLibrary, airportController) {
        super(spawnPatternJson, navigationLibrary, airportController);

        /**
         * Schedule reference id
         *
         * Stored here so a specific interval can be associated with a
         * specfic `SpawnPatternModel` instance. An Interval may be reset
         * or changed during the life of the app.
         *
         * Provides easy access to a specific scheduleId
         *
         * @DEPRECATED
         * @property scheduleId
         * @type {number}
         * @default -1
         * @property _airportController
         * @type {AirportController}
         * @private
         */
        this.scheduleId = -1;

        /**
         *
         * @property _airportController
         * @type {AirportController}
         * @private
         */
        this._airportController = null;

        /**
         * One of `FLIGHT_CATEGORY`
         *
         * @property category
         * @type {string}
         * @default ''
         */
        this.category = '';

        /**
         * Type of arrival or departure pattern
         *
         * Could be `random`, `cyclic`. `surge` or `wave`
         *
         * @property type
         * @type {string}
         * @default ''
         */
        this.method = '';

        /**
         * List of possible airlines a spawning aircraft can belong to.
         *
         * @property airlines
         * @type {array<string>}
         * @default []
         */
        this.airlines = [];

        /**
         * List of airlines enumerated by weight
         *
         * In english, if the value of `this.airlines` was:
         * ```
         * [
         *     ['aal', 5],
         *     ['ual', 2]
         * ]
         * ```
         * This property would have a length of 7, with 5 entires of `aal` and two entries of `ual`.
         * The reason for this is to provide an easy way to find a weighted value. Now all we need is
         * a random index and the value located at that index.
         *
         * @property _weightedAirlineList
         * @type {array}
         * @default []
         */
        this._weightedAirlineList = [];

        /**
         * Aircraft to spawn on airport load
         *
         * This list is evaluated by the `SpawnScheduler` when setting up
         * schedules for each `SpawnPatternModel`.
         *
         * @property preSpawnAircraftList
         * @type {array<object>}
         * @default []
         */
        this.preSpawnAircraftList = [];

        // SPAWNING AIRCRAFT PROPERTIES

        /**
         * The airport this pattern begins at
         *
         * @property origin
         * @type {string}
         * @default ''
         */
        this.origin = '';

        /**
         * The airport icao id this pattern's aircraft will land at
         * or the procedure name the aircraft is departing with
         *
         * @property destination
         * @type {string}
         * @default ''
         */
        this.destination = '';

        /**
         * String representation of a `StandardRoute` or a list of fixes
         *
         * @property routeString
         * @type {string}
         * @default
         */
        this.routeString = '';

        /**
         * List of fixes to follow on spawn.
         *
         * This property will be set to an array of strings representing
         * fixnames. this is only used when a DirectRouteString has been
         * passed for the route parameter.
         *
         * @property waypoints
         * @type {array<string>}
         * @default []
         */
        this.waypoints = [];

        /**
         * Lowest altitude an aircraft can spawn at
         *
         * @property _minimumAltitude
         * @type {number}
         * @default -1
         * @private
         */
        this._minimumAltitude = -1;

        /**
         * Highest altitude an aircraft can spawn at
         *
         * @property _maximumAltitude
         * @type {number}
         * @default -1
         * @private
         */
        this._maximumAltitude = -1;

        /**
         * Speed of spawning aircraft
         *
         * @property speed
         * @type {number}
         * @default 0
         */
        this.speed = 0;

        /**
         * Heading of a spawning aircraft
         *
         * @property heading
         * @type {number}
         * @default -1
         */
        this.heading = -1;

        /**
         * Initial position of a spawning aircraft
         *
         * Defaults to [0, 0] which equates the the airport midfield and should
         * only apply to departing aircraft.
         *
         * An arriving aircraft should be assigned a position along an arrival
         * route, in which case this default will not be used.
         *
         * @property position
         * @type {array}
         * @default [0, 0]
         */
        this.position = [0, 0];

        // SPAWN PATTERN PROPERTIES

        /**
         * Rate at which aircaft spawn, express in aircraft per hour
         *
         * @property rate
         * @type {number}
         * @default -1
         */
        this.rate = -1;

        /**
         * GameTime when a specific spawn pattern started
         *
         * Used only for cycle, surge and wave patterns
         *
         * @property cycleStartTime
         * @type {number}
         * @default -1
         */
        this.cycleStartTime = -1;

        /**
         * Used only with cycle, surge or wave spawnPatters
         *
         * Shifts the pattern to a different part of the cycle
         *
         * @property offset
         * @type {number}
         * @default -1
         */
        this.offset = -1;

        /**
         * Used only with cycle, surge or wave spawnPatters
         *
         * Length of a pattern cycle
         *
         * @property period
         * @type {number}
         * @default -1
         */
        this.period = -1;

        /**
         * Used only with cycle, surge or wave spawnPatters
         *
         * @property variation
         * @type {number}
         * @default -1
         */
        this.variation = -1;

        /**
         * Calculated milisecond delay from `rate`.
         *
         * Is used as the upper bound when getting a random delay value.
         *
         * This value does not take game speed (timewarp) into effect, thus
         * this value may need to be translated by the class or method using it.
         *
         * @property _maximumDelay
         * @type {number}
         * @default -1
         * @private
         */
        this._maximumDelay = -1;

        // TODO: this is currently an internal property but could be defined in
        //       the `spawnPattern` section of airport.json
        /**
         * Minimum milisecond elay between spawn.
         *
         * Is used as the lower bound when getting a random delay value.
         *
         * @property _minimumDelay
         * @type {number}
         * @default -1
         * @private
         */
        this._minimumDelay = -1;

        /**
         * Miles entrail during the surge [fast, slow]
         *
         * Used only for `surge` spawn patterns. set as a class
         * property to allow maintainence of state between spawns
         *
         * @property entrail
         * @type {number}
         * @default
         */
        this.entrail = [5.5, 10];

        /**
         * calculated arrival rate when "in the surge"
         *
         * Used only for `surge` spawn patterns. set as a class
         * property to allow maintainence of state between spawns
         *
         * @property _aircraftPerHourUp
         * @type {number}
         * @default -1
         * @private
         */
        this._aircraftPerHourUp = -1;

        /**
         * calculated arrival rate when not "in the surge"
         *
         * Used only for `surge` spawn patterns. set as a class
         * property to allow maintainence of state between spawns
         *
         * @property _aircraftPerHourDown
         * @type {number}
         * @default -1
         * @private
         */
        this._aircraftPerHourDown = -1;

        /**
         * Calculated time length of surge, in minutes
         *
         * Used only for `surge` spawn patterns. set as a class
         * property to allow maintainence of state between spawns
         *
         * @property _uptime
         * @type {number}
         * @default -1
         * @private
         */
        this._uptime = -1;

        this.init(spawnPatternJson, navigationLibrary, airportController);
    }

    /**
     * List of airline icaos for this spawnPattern
     *
     * @property airlineList
     * @return {array<string>}
     */
    get airlineList() {
        return _map(this.airlines, (airline) => airline.name);
    }

    /**
     * Initial altitude of a spawning aircraft
     *
     * value rounded to the nearest thousandth foot
     *
     * @property altitude
     * @return {number}
     */
    get altitude() {
        const altitude = _random(this._minimumAltitude, this._maximumAltitude);

        return _round(altitude, -3);
    }

    /**
     * Lifecycle method. Should be run only once on instantiation.
     *
     * Set up the instance properties
     *
     * This is a pooled object so we verify essential parameters
     * here instead of the constructor
     *
     * @for SpawnPatternModel
     * @method init
     * @param spawnPatternJson {object}
     * @param navigationLibrary {NavigationLibrary}
     * @param airportController {AirportController}
     */
    init(spawnPatternJson, navigationLibrary, airportController) {
        if (!_isObject(spawnPatternJson) || _isEmpty(spawnPatternJson)) {
            return;
        }

        if (!_isObject(navigationLibrary) || _isEmpty(navigationLibrary)) {
            throw new TypeError('Invalid NavigationLibrary passed to SpawnPatternModel');
        }

        if (!_isObject(airportController) || _isEmpty(airportController)) {
            throw new TypeError('Invalid AirportController passed to SpawnPatternModel');
        }

        // TODO: this is a temporary development check. this should be removed before merging in to develop
        if (!spawnPatternModelJsonValidator(spawnPatternJson)) {
            console.error('### Invalid spawnPatternJson received', spawnPatternJson);
        }

        this._airportController = airportController;
        this.origin = spawnPatternJson.origin;
        this.destination = spawnPatternJson.destination;
        this.category = spawnPatternJson.category;
        this.method = spawnPatternJson.method;
        this.rate = spawnPatternJson.rate;
        this.routeString = spawnPatternJson.route;
        this.cycleStartTime = 0;
        this.period = TIME.ONE_HOUR_IN_SECONDS / 2;
        this.speed = this._extractSpeedFromJson(spawnPatternJson);
        this._minimumDelay = this._calculateMinimumDelayFromSpeed();
        this._maximumDelay = this._calculateMaximumDelayFromSpawnRate();
        this.airlines = this._assembleAirlineNamesAndFrequencyForSpawn(spawnPatternJson.airlines);
        this._weightedAirlineList = this._buildWeightedAirlineList();
        this.preSpawnAircraftList = this._buildPreSpawnAircraft(spawnPatternJson, navigationLibrary, airportController);

        this._calculateSurgePatternInitialDelayValues(spawnPatternJson);
        this._setCyclePeriodAndOffset(spawnPatternJson);
        this._calculatePositionAndHeadingForArrival(spawnPatternJson, navigationLibrary);
        this._setMinMaxAltitude(spawnPatternJson.altitude);
    }

    /**
     * Destroy the current instance properties
     *
     * Useful when changing airports
     *
     * @for SpawnPatternModel
     * @method reset
     */
    reset() {
        this.scheduleId = -1;
        this.category = '';
        this.method = '';
        this.origin = '';
        this.destination = '';
        this.routeString = '';
        this._minimumAltitude = -1;
        this._maximumAltitude = -1;
        this.speed = 0;
        this.heading = -1;
        this.position = [0, 0];

        this.cycleStartTime = -1;
        this.rate = -1;
        this.offset = -1;
        this.period = -1;
        this.variation = -1;
        this._maximumDelay = -1;
        this._minimumDelay = -1;

        this.airlines = [];
        this._weightedAirlineList = [];
        this.preSpawnAircraftList = [];
    }

    /**
     * Sets the `cycleStart` property with the value of the gameClock when the first
     * timer for this pattern is run by the `SpawnScheduler`
     *
     * Used to calculate cycle, wave and surge spawn patterns
     *
     * @for SpawnPatternModel
     * @method cycleStart
     * @param startTime {number}
     */
    cycleStart(startTime) {
        if (this.cycleStartTime !== -1) {
            return;
        }

        this.cycleStartTime = startTime - this.offset;
    }

    /**
     * Return a random value from `_weightedAirlineList`
     *
     * Used for spawning arrival aircraft that do not yet have an assigned airline
     *
     * @for SpawnPatternModel
     * @method getRandomAirlineForSpawn
     * @return {string}
     */
    getRandomAirlineForSpawn() {
        const index = this._findRandomIndexForList(this._weightedAirlineList);
        const airlineId = this._weightedAirlineList[index];

        return airlineId;
    }

    /**
     * Return a number to use for the next delay period calculated based
     * on spawning method.
     *
     * This is the value that will be used by the `SpawnScheduler` when
     * when creating a new spawn interval.
     *
     * @for SpawnPatternModel
     * @method getNextDelayValue
     * @param gameTime {number}
     * @return {number}             Next delay period based on spawn method
     */
    getNextDelayValue(gameTime = 0) {
        switch (this.method) {
            case SPAWN_METHOD.RANDOM:
                return this._calculateRandomDelayPeriod();
            case SPAWN_METHOD.CYCLIC:
                return this._calculateNextCyclicDelayPeriod(gameTime);
            case SPAWN_METHOD.SURGE:
                return this._calculateNextSurgeDelayPeriod(gameTime);
            case SPAWN_METHOD.WAVE:
                return this._calculateNextWaveDelayPeriod(gameTime);
            default:
                break;
        }
    }

    /**
     * Calculates the upper bound of the spawn delay value.
     *
     * @for SpawnPatternModel
     * @method _calculateMaximumDelayFromSpawnRate
     * @return {number}
     * @private
     */
    _calculateMaximumDelayFromSpawnRate() {
        return TIME.ONE_HOUR_IN_SECONDS / this.rate;
    }

    /**
     *
     *
     * @for SpawnPatternModel
     * @method _calculateSurgePatternInitialDelayValues
     * @param spawnPatternJson {object}
     * @private
     */
    _calculateSurgePatternInitialDelayValues(spawnPatternJson) {
        if (spawnPatternJson.method !== SPAWN_METHOD.SURGE) {
            return;
        }

        // TODO: accept `entrail` param from json
        this._aircraftPerHourUp = this.speed / this.entrail[0];
        this._aircraftPerHourDown = this.speed / this.entrail[1];  // to help the uptime calculation

        this.uptime = (this.period * this.rate - this.period * this._aircraftPerHourDown) / (this._aircraftPerHourUp - this._aircraftPerHourDown);
        this.uptime -= this.uptime % (TIME.ONE_HOUR_IN_SECONDS / this._aircraftPerHourUp);

        // TODO: abstract to helpe
        // adjust to maintain correct acph rate
        const averageSpawnRate = this.rate * this.period * TIME.ONE_SECOND_IN_HOURS;
        const elevatedSpawnRate = this._aircraftPerHourUp * this.uptime * TIME.ONE_SECOND_IN_HOURS;
        const downTime = this.period - this.uptime;
        const hoursSpentAtReducedSpawnRate = downTime * TIME.ONE_SECOND_IN_HOURS;
        const reducedSpawnRate = (averageSpawnRate - elevatedSpawnRate) * hoursSpentAtReducedSpawnRate;

        this._aircraftPerHourDown = reducedSpawnRate;


        // TODO: abstract this if/else block
        // Verify we can comply with the requested arrival rate based on entrail spacing
        if (this.rate > this._aircraftPerHourUp) {
            console.warn('TOO MANY ARRIVALS IN SURGE! Requested: ' +
                `${this.rate} acph | Acceptable Range for requested entrail distance: ` +
                `${Math.ceil(this._aircraftPerHourDown)} acph - ${Math.floor(this._aircraftPerHourUp)} acph`);

            this.rate = this._aircraftPerHourUp;
            this._aircraftPerHourDown = this._aircraftPerHourUp;
        } else if (this.rate < this._aircraftPerHourDown) {
            console.warn('TOO FEW ARRIVALS IN SURGE! Requested: ' +
                `${this.rate} acph | Acceptable Range for requested entrail distance: ` +
                `${Math.ceil(this._aircraftPerHourDown)} acph - ${Math.floor(this._aircraftPerHourUp)} acph`);

            this.rate = this._aircraftPerHourDown;
            this._aircraftPerHourUp = this._aircraftPerHourDown;
        }
    }

    /**
     *
     *
     * @for SpawnPatternModel
     * @method _setCyclePeriodAndOffset
     * @param spawnPatternJson {object}
     * @private
     */
    _setCyclePeriodAndOffset(spawnPatternJson) {
        const offset = _get(spawnPatternJson, 'offset', 0);
        const period = _get(spawnPatternJson, 'period', null);

        this.offset = convertMinutesToSeconds(offset);
        this.period = period
            ? convertMinutesToSeconds(period)
            : this.period;
        this.variation = _get(spawnPatternJson, 'variation', 0);
    }

    /**
     * Sets `_minimumAltitude` and `_maximumAltitude` from a provided altitude.
     *
     * Altitude may be a single number or a range, expressed as: `[min, max]`.
     * This method handles that variation and sets the class properties with
     * the correct values.
     *
     * @for SpawnPatternModel
     * @method _setMinMaxAltitude
     * @param altitude {array|number}
     * @private
     */
    _setMinMaxAltitude(altitude) {
        if (_isArray(altitude)) {
            const [min, max] = altitude;

            this._minimumAltitude = min;
            this._maximumAltitude = max;

            return;
        }

        this._minimumAltitude = altitude;
        this._maximumAltitude = altitude;
    }

    /**
     *
     *
     * @for SpawnPatternModel
     * @method _calculateRandomDelayPeriod
     * @return {number}
     * @private
     */
    _calculateRandomDelayPeriod() {
        let targetDelayPeriod = this._maximumDelay;

        if (targetDelayPeriod < this._minimumDelay) {
            targetDelayPeriod = this._minimumDelay;
        }

        const maxDelayPeriod = targetDelayPeriod + (targetDelayPeriod - this._minimumDelay);

        return _random(this._minimumDelay, maxDelayPeriod);
    }

    /**
     * @for SpawnPatternModel
     * @method _calculateMinimumDelayFromSpeed
     * @return {number}  number to use as a delay period for the next delay
     * @private
     */
    _calculateMinimumDelayFromSpeed() {
        if (this.speed === 0) {
            return 0;
        }

        return Math.floor(AIRPORT_CONSTANTS.MIN_ENTRAIL_DISTANCE_NM * (TIME.ONE_HOUR_IN_SECONDS / this.speed));
    }

    /**
     * Calculates the correct delay period to create arrivals in a cyclic pattern.
     *
     * Rate at which the arrival rate increases or decreases remains constant throughout the cycle.
     *
     * |---o---------------o---------------o---------------o-----------| < - - - - - - max arrival rate
     * | o   o           o   o           o   o           o   o         |   +variation
     * o-------o-------o-------o-------o-------o-------o-------o-------o < - - - - - - avg arrival rate
     * |         o   o |         o   o           o   o           o   o |   -variation
     * |-----------o---|-----------o---------------o---------------o---| < - - - - - - min arrival rate
     * |<---period---->|           |<---period---->|
     *
     *
     * @for SpawnPatternModel
     * @method _calculateNextCyclicDelayPeriod
     * @param gameTime {number} current gameTime
     * @return {number}         number to use as a delay period for the next delay
     * @private
     */
    _calculateNextCyclicDelayPeriod(gameTime) {
        const totalTime = gameTime - this.cycleStartTime;
        const progressInPeriod = totalTime / (this.period / 4);

        if (progressInPeriod >= 4) {
            this.cycleStartTime += this.period;

            return TIME.ONE_HOUR_IN_SECONDS / (this.rate + (progressInPeriod - 4) * this.variation);
        } else if (progressInPeriod <= 1) {
            return TIME.ONE_HOUR_IN_SECONDS / (this.rate + progressInPeriod * this.variation);
        } else if (progressInPeriod <= 2) {
            return TIME.ONE_HOUR_IN_SECONDS / (this.rate + (2 * (this.period - 2 * totalTime) / this.period) * this.variation);
        } else if (progressInPeriod <= 3) {
            return TIME.ONE_HOUR_IN_SECONDS / (this.rate - (progressInPeriod - 2) * this.variation);
        } else if (progressInPeriod < 4) {
            return TIME.ONE_HOUR_IN_SECONDS / (this.rate - (4 * (this.period - totalTime) / this.period) * this.variation);
        }
    }

    /**
     * Calculate a delay period that goes from very low and steeply increases to a
     * sustained arrival surge of densely packed aircraft.
     *
     * Example airport: `EDDT - Berlin Tegel Airport`
     *
     * o o o o o o o o o o - - - - - - - - - - - o o o o o o o o o o-----+ < - - - max arrival rate ( *this.factor)
     * o                 o                       o                 o     |
     * o                 o                       o                 o     |   x(this.factor)
     * o                 o                       o                 o     |
     * o - - - - - - - - o o o o o o o o o o o o o - - - - - - - - o o o-+ < - - - min arrival rate (n)
     * |<--- up time --->|<----- down time ----->|<--- up time --->|
     *
     * @for SpawnPatternModel
     * @method _calculateNextSurgeDelayPeriod
     * @param gameTime {number} current gameTime
     * @return {number}         number to use as a delay period for the next delay
     * @private
     */
    _calculateNextSurgeDelayPeriod(gameTime) {
        const totalTime = gameTime - this.cycleStartTime;
        const progressInPeriod = totalTime / this.period; // progress in period
        const intervalUp = TIME.ONE_HOUR_IN_SECONDS / this._aircraftPerHourUp;
        const intervalDown = TIME.ONE_HOUR_IN_SECONDS / this._aircraftPerHourDown;
        // reduced spawn rate
        const timeRemaining = this.period - totalTime;

        if (progressInPeriod >= 1) {
            this.cycleStartTime += this.period;

            return intervalUp;
        }

        // elevated spawn rate
        if (totalTime <= this.uptime) {
            return intervalUp;
        }

        if (timeRemaining > intervalDown + intervalUp) {
            // plenty of time until new period
            return intervalDown;
        } else if (timeRemaining > intervalDown) {
            // next plane will delay the first arrival of the next period
            return intervalDown - (totalTime + intervalDown + intervalUp - this.period);
        }

        // next plane is first of elevated spawn rate
        this.cycleStartTime += this.period;

        return intervalUp;
    }

    /**
     * Calculate a delay period that will increase and decrease faster when changing between the lower/higher rates.
     *
     * ------------o-o-o---------------------------------------+-----------o-o < - - - - - max arrival rate
     *        o             o                                  |      o      |       ^
     *    o                     o                              |  o          |  +variation
     *  o                         o                            |o            |       v
     * o-------------------------- o---------------------------o-------------+ < - - - - - avg arrival rate
     * |                            o                         o|             |       ^
     * |                              o                     o  |             |  -variation
     * |                                  o             o      |             |       v
     * +---------------------------------------o-o-o-----------+-------------+ < - - - - - min arrival rate
     * |                                                       |
     * |<  -  -  -  -  -  -  -  - period -  -  -  -  -  -  -  >|
     *
     *
     * @for SpawnPatternModel
     * @method _calculateNextWaveDelayPeriod
     * @param gameTime {number} current gameTime
     * @return {number}         number to use as a delay period for the next delay
     * @private
     */
    _calculateNextWaveDelayPeriod(gameTime) {
        const t = gameTime - this.cycleStartTime;
        const progressInPeriod = t / this.period;

        if (progressInPeriod >= 1) {
            this.cycleStartTime += this.period;
        }

        const rate = this.rate + this.variation * Math.sin(progressInPeriod * tau());

        return TIME.ONE_HOUR_IN_SECONDS / rate;
    }

    /**
     * Abstracted boolean logic used to determine if a category is valid.
     *
     * @for SpawnPatternModel
     * @method _isValidCategory
     * @param _isValidCategory {string}
     * @return {boolean}
     * @private
     */
    _isValidCategory(category) {
        return category === FLIGHT_CATEGORY.DEPARTURE || category === FLIGHT_CATEGORY.ARRIVAL;
    }

    /**
     * Returns a random index number for an array
     *
     * @for SpawnPatternModel
     * @method _findRandomIndexForList
     * @param list {array}
     * @return {number}
     * @private
     */
    _findRandomIndexForList(list) {
        return _random(0, list.length - 1);
    }

    /**
     * When `speed` is null, return 0 otherwise the specified speed value
     *
     * @for SpawnPatternModel
     * @method _extractSpeedFromJson
     * @param spawnPatternJson {object}
     * @return {number}
     */
    _extractSpeedFromJson(spawnPatternJson) {
        if (!spawnPatternJson.speed) {
            return 0;
        }

        return spawnPatternJson.speed;
    }

    /**
     * Loops through defined airlines for the spawn pattern and transforms them from array values
     * to an object with meaningful keys.
     *
     * The result is used internally to build the `weightedAirlineList`.
     *
     * In the future the assembled object could, itself, be a defined model object
     *
     * @for SpawnPatternModel
     * @method _assembleAirlineNamesAndFrequencyForSpawn
     * @param spawnPatternAirlines {array<array>}
     * @return {array<object>}
     * @private
     */
    _assembleAirlineNamesAndFrequencyForSpawn(spawnPatternAirlines) {
        const spawnPatternAirlineModels = _map(spawnPatternAirlines, (spawnPatternAirline) => ({
            name: spawnPatternAirline[0],
            rate: spawnPatternAirline[1]
        }));

        return spawnPatternAirlineModels;
    }

    /**
     * Build the values for `_weightedAirlineList`
     *
     * see doc block for `_weightedAirlineList` property for more information
     * about what this method produces and why
     *
     * @for SpawnPatternModel
     * @method _buildWeightedAirlineList
     * @return {array<string>}
     * @private
     */
    _buildWeightedAirlineList() {
        const weightedAirlineList = [];

        _forEach(this.airlines, (airline) => {
            for (let i = 0; i < airline.rate; i++) {
                weightedAirlineList.push(airline.name);
            }
        });

        return weightedAirlineList;
    }

    /**
     * Builds a list of objects used to create the initial aircraft
     * that exist within the app onLoad or onAirportChange.
     *
     * @for SpawnPatternModel
     * @method _buildPreSpawnAircraft
     * @param spawnPatternJson {object}
     * @param navigationLibrary {NavigationLibrary}
     * @param airportController {AirportController}
     */
    _buildPreSpawnAircraft(spawnPatternJson, navigationLibrary, airportController) {
        if (this._isDeparture()) {
            // FIXME: this may be dead, please remove if it is
            const preSpawnDepartureAircraft = [{
                type: 'departure'
            }];

            return preSpawnDepartureAircraft;
        }

        const preSpawnArrivalAircraftList = buildPreSpawnAircraft(
            spawnPatternJson,
            navigationLibrary,
            airportController.airport.current
        );

        return preSpawnArrivalAircraftList;
    }

    /**
     * Calculate the initial heading and position for a spawning arrival.
     *
     * Sets `position` and `heading` properties.
     *
     * @for SpawnPatternModel
     * @method _calculatePositionAndHeadingForArrival
     * @param spawnPatternJson {object}
     * @param navigationLibrary {NavigationLibrary}
     * @private
     */
    _calculatePositionAndHeadingForArrival(spawnPatternJson, navigationLibrary) {
        if (spawnPatternJson.category === FLIGHT_CATEGORY.DEPARTURE) {
            return;
        }

        const waypointModelList = this._generateWaypointListForRoute(spawnPatternJson.route, navigationLibrary);
        // grab position of first fix/waypoint
        const initialPosition = waypointModelList[0].position;
        // calculate heading from first fix/waypoint to second fix/waypoint
        const heading = bearingToPoint(initialPosition, waypointModelList[1].position);

        this.position = initialPosition;
        this.heading = heading;
    }

    /**
     *
     *
     * @for SpawnPatternModel
     * @method _generateWaypointListForRoute
     * @param route {string}
     * @param navigationLibrary {NavigationLibrary}
     * @return {array<FixModel>|array<StandardWaypointModel>}
     */
    _generateWaypointListForRoute(route, navigationLibrary) {
        const formattedRoute = routeStringFormatHelper(route);

        if (!RouteModel.isProcedureRouteString(formattedRoute[0])) {
            // this assumes that if a routeString is not a procedure, it will be a list of fixes. this may be
            // an incorrect/short sided assumption and may need to be revisited in the near future.
            this.waypoints = formattedRoute;
            const initialWaypoint = navigationLibrary.findFixByName(formattedRoute[0]);
            const nextWaypoint = navigationLibrary.findFixByName(formattedRoute[1]);

            return [initialWaypoint, nextWaypoint];
        }

        const routeModel = new RouteModel(formattedRoute[0]);
        const waypointModelList = navigationLibrary.findEntryAndBodyFixesForRoute(
            routeModel.procedure,
            routeModel.entry
        );

        return waypointModelList;
    }

    /**
     * Used to determine if this spawn pattern is for an departing aircraft
     *
     * @for SpawnPatternModel
     * @method _isDeparture
     * @return {boolean}
     * @private
     */
    _isDeparture() {
        return this.category === FLIGHT_CATEGORY.DEPARTURE;
    }

    /**
     * Used to determine if this spawn pattern is for an arriving aircraft
     *
     * @for SpawnPatternModel
     * @method _isArrival
     * @return {boolean}
     * @private
     */
    _isArrival() {
        return this.category === FLIGHT_CATEGORY.ARRIVAL;
    }
}
