import ava from 'ava';

import AirspaceModel from '../../src/assets/scripts/client/airport/AirspaceModel';
import StaticPositionModel from '../../src/assets/scripts/client/base/StaticPositionModel';
import { AIRSPACE_MOCK, AIRSPACE_MOCK_WITH_CLOSING_ENTRY } from './_mocks/airspaceModelMocks';
import Compass from '../../src/assets/scripts/client/base/Compass';

const currentPosition = ['N36.080056', 'W115.15225', '2181ft'];
const airportPositionFixtureKSFO = new StaticPositionModel(currentPosition, null);
const airportMagneticNorthKSFO = 11.9;

ava('throws if called with invalid parameters', t => {
    t.throws(() => new AirspaceModel());
    t.throws(() => new AirspaceModel(AIRSPACE_MOCK));
    t.throws(() => new AirspaceModel(null, airportPositionFixtureKSFO));
    t.throws(() => new AirspaceModel(AIRSPACE_MOCK, null));
});

ava('accepts an airspace object that is used to set the instance properties', t => {
    Compass.magneticNorth = airportMagneticNorthKSFO;

    const model = new AirspaceModel(AIRSPACE_MOCK, airportPositionFixtureKSFO);

    t.false(typeof model._id === 'undefined');
    t.true(model.floor === (AIRSPACE_MOCK.floor * 100));
    t.true(model.ceiling === (AIRSPACE_MOCK.ceiling * 100));
    t.true(model.airspace_class === AIRSPACE_MOCK.airspace_class);
    t.true(model.poly.length === AIRSPACE_MOCK.poly.length);
});

ava('removes last element in poly array if it is the same as the first element', t => {
    Compass.magneticNorth = airportMagneticNorthKSFO;

    const model = new AirspaceModel(AIRSPACE_MOCK_WITH_CLOSING_ENTRY, airportPositionFixtureKSFO);

    t.false(model.poly.length === AIRSPACE_MOCK_WITH_CLOSING_ENTRY.poly.length);
    t.true(model.poly.length === AIRSPACE_MOCK_WITH_CLOSING_ENTRY.poly.length - 1);
});
