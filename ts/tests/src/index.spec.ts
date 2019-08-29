// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');


import {
  VoilaView
} from '../../src/widget'


describe('Widget', () => {

  describe('VoilaView', () => {

    it('should be createable', () => {
      let view = new VoilaView('a', undefined as any, undefined as any);
      expect(view).to.be.an(VoilaView);
    });

  });

});
