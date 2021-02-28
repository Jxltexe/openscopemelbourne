import ava from 'ava';
import SystemCommandModel
    from '../../../src/assets/scripts/client/commands/definitions/systemCommand/SystemCommandModel';
import {
    SYSTEM_COMMAND_MAP,
    isSystemCommand
} from '../../../src/assets/scripts/client/commands/definitions/systemCommand/systemCommandMap';
import { timewarpParser } from '../../../src/assets/scripts/client/commands/parsers/argumentParsers';
import {
    noopParse,
    zeroArgVal,
    singleArgVal,
    strToNumArrayParse,
    zeroOrOneArgumentVal,
    self_alias,
    test_aliases
} from './testUtils';


const extractParseAndValidate = (t, cmd) => {
    const model = new SystemCommandModel(cmd);
    const parse = model._commandDefinition.parse.toString();
    const validate = model._commandDefinition.validate.toString();
    return [parse, validate];
};

ava('aliases, noop parser and zeroArgumentsValidator used by airac', t => {
    const [parse, validate] = extractParseAndValidate(t, 'airac');
    t.true(parse === noopParse() && validate === zeroArgVal());
    self_alias(t, SYSTEM_COMMAND_MAP, 'airac');
});

ava('aliases, noop parser and singleArgumentValidator used by airport', t => {
    const [parse, validate] = extractParseAndValidate(t, 'airport');
    t.true(parse === noopParse() && validate === singleArgVal());
    self_alias(t, SYSTEM_COMMAND_MAP, 'airport');
});

ava('aliases, noop parser and zeroArgumentsValidator used by auto', t => {
    const [parse, validate] = extractParseAndValidate(t, 'auto');
    t.true(parse === noopParse() && validate === zeroArgVal());
    self_alias(t, SYSTEM_COMMAND_MAP, 'auto');
});

ava('aliases, noop parser and zeroArgumentsValidator used by clear', t => {
    const [parse, validate] = extractParseAndValidate(t, 'clear');
    t.true(parse === noopParse() && validate === zeroArgVal());
    self_alias(t, SYSTEM_COMMAND_MAP, 'clear');
});

ava('aliases, noop parser and zeroArgumentsValidator used by pause', t => {
    const [parse, validate] = extractParseAndValidate(t, 'pause');
    t.true(parse === noopParse() && validate === zeroArgVal());
    self_alias(t, SYSTEM_COMMAND_MAP, 'pause');
});

ava('aliases, noop parser and zeroArgumentsValidator used by tutorial', t => {
    const [parse, validate] = extractParseAndValidate(t, 'tutorial');
    t.true(parse === noopParse() && validate === zeroArgVal());
    self_alias(t, SYSTEM_COMMAND_MAP, 'tutorial');
});

ava('aliases, strToNumArray parser and singleArgumentValidator used by rate', t => {
    const [parse, validate] = extractParseAndValidate(t, 'rate');
    t.true(parse === strToNumArrayParse() && validate === singleArgVal());
    self_alias(t, SYSTEM_COMMAND_MAP, 'rate');
});

ava('aliases, timewarp parser and zeroOrOneArgumentValidator used by timewarp', t => {
    const [parse, validate] = extractParseAndValidate(t, 'timewarp');
    const p = timewarpParser;
    const v = zeroOrOneArgumentVal();
    t.true(parse === p.toString() && validate === v.toString());
    test_aliases(t, SYSTEM_COMMAND_MAP, 'timewarp', ['timewarp', 'tw']);
});

ava('make sure we test all 8 system commands', t => {
    t.true(Object.values(SYSTEM_COMMAND_MAP).length === 8);
});


ava('isSystemCommand() returns true if command is a system command', t => {
    const systemCommandMock = 'timewarp';
    t.true(isSystemCommand(systemCommandMock));
});

ava('isSystemCommand() returns false if command is not a system command', t => {
    const transmitCommandMock = 'climb';
    t.false(isSystemCommand(transmitCommandMock));
});
