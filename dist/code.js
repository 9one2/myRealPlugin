"use strict";
(() => {
  // node_modules/pako/dist/pako.esm.mjs
  var Z_FIXED$1 = 4;
  var Z_BINARY = 0;
  var Z_TEXT = 1;
  var Z_UNKNOWN$1 = 2;
  function zero$1(buf) {
    let len = buf.length;
    while (--len >= 0) {
      buf[len] = 0;
    }
  }
  var STORED_BLOCK = 0;
  var STATIC_TREES = 1;
  var DYN_TREES = 2;
  var MIN_MATCH$1 = 3;
  var MAX_MATCH$1 = 258;
  var LENGTH_CODES$1 = 29;
  var LITERALS$1 = 256;
  var L_CODES$1 = LITERALS$1 + 1 + LENGTH_CODES$1;
  var D_CODES$1 = 30;
  var BL_CODES$1 = 19;
  var HEAP_SIZE$1 = 2 * L_CODES$1 + 1;
  var MAX_BITS$1 = 15;
  var Buf_size = 16;
  var MAX_BL_BITS = 7;
  var END_BLOCK = 256;
  var REP_3_6 = 16;
  var REPZ_3_10 = 17;
  var REPZ_11_138 = 18;
  var extra_lbits = (
    /* extra bits for each length code */
    new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0])
  );
  var extra_dbits = (
    /* extra bits for each distance code */
    new Uint8Array([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13])
  );
  var extra_blbits = (
    /* extra bits for each bit length code */
    new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7])
  );
  var bl_order = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
  var DIST_CODE_LEN = 512;
  var static_ltree = new Array((L_CODES$1 + 2) * 2);
  zero$1(static_ltree);
  var static_dtree = new Array(D_CODES$1 * 2);
  zero$1(static_dtree);
  var _dist_code = new Array(DIST_CODE_LEN);
  zero$1(_dist_code);
  var _length_code = new Array(MAX_MATCH$1 - MIN_MATCH$1 + 1);
  zero$1(_length_code);
  var base_length = new Array(LENGTH_CODES$1);
  zero$1(base_length);
  var base_dist = new Array(D_CODES$1);
  zero$1(base_dist);
  function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {
    this.static_tree = static_tree;
    this.extra_bits = extra_bits;
    this.extra_base = extra_base;
    this.elems = elems;
    this.max_length = max_length;
    this.has_stree = static_tree && static_tree.length;
  }
  var static_l_desc;
  var static_d_desc;
  var static_bl_desc;
  function TreeDesc(dyn_tree, stat_desc) {
    this.dyn_tree = dyn_tree;
    this.max_code = 0;
    this.stat_desc = stat_desc;
  }
  var d_code = (dist) => {
    return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
  };
  var put_short = (s, w) => {
    s.pending_buf[s.pending++] = w & 255;
    s.pending_buf[s.pending++] = w >>> 8 & 255;
  };
  var send_bits = (s, value, length) => {
    if (s.bi_valid > Buf_size - length) {
      s.bi_buf |= value << s.bi_valid & 65535;
      put_short(s, s.bi_buf);
      s.bi_buf = value >> Buf_size - s.bi_valid;
      s.bi_valid += length - Buf_size;
    } else {
      s.bi_buf |= value << s.bi_valid & 65535;
      s.bi_valid += length;
    }
  };
  var send_code = (s, c, tree) => {
    send_bits(
      s,
      tree[c * 2],
      tree[c * 2 + 1]
      /*.Len*/
    );
  };
  var bi_reverse = (code, len) => {
    let res = 0;
    do {
      res |= code & 1;
      code >>>= 1;
      res <<= 1;
    } while (--len > 0);
    return res >>> 1;
  };
  var bi_flush = (s) => {
    if (s.bi_valid === 16) {
      put_short(s, s.bi_buf);
      s.bi_buf = 0;
      s.bi_valid = 0;
    } else if (s.bi_valid >= 8) {
      s.pending_buf[s.pending++] = s.bi_buf & 255;
      s.bi_buf >>= 8;
      s.bi_valid -= 8;
    }
  };
  var gen_bitlen = (s, desc) => {
    const tree = desc.dyn_tree;
    const max_code = desc.max_code;
    const stree = desc.stat_desc.static_tree;
    const has_stree = desc.stat_desc.has_stree;
    const extra = desc.stat_desc.extra_bits;
    const base = desc.stat_desc.extra_base;
    const max_length = desc.stat_desc.max_length;
    let h;
    let n, m;
    let bits;
    let xbits;
    let f;
    let overflow = 0;
    for (bits = 0; bits <= MAX_BITS$1; bits++) {
      s.bl_count[bits] = 0;
    }
    tree[s.heap[s.heap_max] * 2 + 1] = 0;
    for (h = s.heap_max + 1; h < HEAP_SIZE$1; h++) {
      n = s.heap[h];
      bits = tree[tree[n * 2 + 1] * 2 + 1] + 1;
      if (bits > max_length) {
        bits = max_length;
        overflow++;
      }
      tree[n * 2 + 1] = bits;
      if (n > max_code) {
        continue;
      }
      s.bl_count[bits]++;
      xbits = 0;
      if (n >= base) {
        xbits = extra[n - base];
      }
      f = tree[n * 2];
      s.opt_len += f * (bits + xbits);
      if (has_stree) {
        s.static_len += f * (stree[n * 2 + 1] + xbits);
      }
    }
    if (overflow === 0) {
      return;
    }
    do {
      bits = max_length - 1;
      while (s.bl_count[bits] === 0) {
        bits--;
      }
      s.bl_count[bits]--;
      s.bl_count[bits + 1] += 2;
      s.bl_count[max_length]--;
      overflow -= 2;
    } while (overflow > 0);
    for (bits = max_length; bits !== 0; bits--) {
      n = s.bl_count[bits];
      while (n !== 0) {
        m = s.heap[--h];
        if (m > max_code) {
          continue;
        }
        if (tree[m * 2 + 1] !== bits) {
          s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
          tree[m * 2 + 1] = bits;
        }
        n--;
      }
    }
  };
  var gen_codes = (tree, max_code, bl_count) => {
    const next_code = new Array(MAX_BITS$1 + 1);
    let code = 0;
    let bits;
    let n;
    for (bits = 1; bits <= MAX_BITS$1; bits++) {
      code = code + bl_count[bits - 1] << 1;
      next_code[bits] = code;
    }
    for (n = 0; n <= max_code; n++) {
      let len = tree[n * 2 + 1];
      if (len === 0) {
        continue;
      }
      tree[n * 2] = bi_reverse(next_code[len]++, len);
    }
  };
  var tr_static_init = () => {
    let n;
    let bits;
    let length;
    let code;
    let dist;
    const bl_count = new Array(MAX_BITS$1 + 1);
    length = 0;
    for (code = 0; code < LENGTH_CODES$1 - 1; code++) {
      base_length[code] = length;
      for (n = 0; n < 1 << extra_lbits[code]; n++) {
        _length_code[length++] = code;
      }
    }
    _length_code[length - 1] = code;
    dist = 0;
    for (code = 0; code < 16; code++) {
      base_dist[code] = dist;
      for (n = 0; n < 1 << extra_dbits[code]; n++) {
        _dist_code[dist++] = code;
      }
    }
    dist >>= 7;
    for (; code < D_CODES$1; code++) {
      base_dist[code] = dist << 7;
      for (n = 0; n < 1 << extra_dbits[code] - 7; n++) {
        _dist_code[256 + dist++] = code;
      }
    }
    for (bits = 0; bits <= MAX_BITS$1; bits++) {
      bl_count[bits] = 0;
    }
    n = 0;
    while (n <= 143) {
      static_ltree[n * 2 + 1] = 8;
      n++;
      bl_count[8]++;
    }
    while (n <= 255) {
      static_ltree[n * 2 + 1] = 9;
      n++;
      bl_count[9]++;
    }
    while (n <= 279) {
      static_ltree[n * 2 + 1] = 7;
      n++;
      bl_count[7]++;
    }
    while (n <= 287) {
      static_ltree[n * 2 + 1] = 8;
      n++;
      bl_count[8]++;
    }
    gen_codes(static_ltree, L_CODES$1 + 1, bl_count);
    for (n = 0; n < D_CODES$1; n++) {
      static_dtree[n * 2 + 1] = 5;
      static_dtree[n * 2] = bi_reverse(n, 5);
    }
    static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS$1 + 1, L_CODES$1, MAX_BITS$1);
    static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES$1, MAX_BITS$1);
    static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES$1, MAX_BL_BITS);
  };
  var init_block = (s) => {
    let n;
    for (n = 0; n < L_CODES$1; n++) {
      s.dyn_ltree[n * 2] = 0;
    }
    for (n = 0; n < D_CODES$1; n++) {
      s.dyn_dtree[n * 2] = 0;
    }
    for (n = 0; n < BL_CODES$1; n++) {
      s.bl_tree[n * 2] = 0;
    }
    s.dyn_ltree[END_BLOCK * 2] = 1;
    s.opt_len = s.static_len = 0;
    s.sym_next = s.matches = 0;
  };
  var bi_windup = (s) => {
    if (s.bi_valid > 8) {
      put_short(s, s.bi_buf);
    } else if (s.bi_valid > 0) {
      s.pending_buf[s.pending++] = s.bi_buf;
    }
    s.bi_buf = 0;
    s.bi_valid = 0;
  };
  var smaller = (tree, n, m, depth) => {
    const _n2 = n * 2;
    const _m2 = m * 2;
    return tree[_n2] < tree[_m2] || tree[_n2] === tree[_m2] && depth[n] <= depth[m];
  };
  var pqdownheap = (s, tree, k) => {
    const v = s.heap[k];
    let j = k << 1;
    while (j <= s.heap_len) {
      if (j < s.heap_len && smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
        j++;
      }
      if (smaller(tree, v, s.heap[j], s.depth)) {
        break;
      }
      s.heap[k] = s.heap[j];
      k = j;
      j <<= 1;
    }
    s.heap[k] = v;
  };
  var compress_block = (s, ltree, dtree) => {
    let dist;
    let lc;
    let sx = 0;
    let code;
    let extra;
    if (s.sym_next !== 0) {
      do {
        dist = s.pending_buf[s.sym_buf + sx++] & 255;
        dist += (s.pending_buf[s.sym_buf + sx++] & 255) << 8;
        lc = s.pending_buf[s.sym_buf + sx++];
        if (dist === 0) {
          send_code(s, lc, ltree);
        } else {
          code = _length_code[lc];
          send_code(s, code + LITERALS$1 + 1, ltree);
          extra = extra_lbits[code];
          if (extra !== 0) {
            lc -= base_length[code];
            send_bits(s, lc, extra);
          }
          dist--;
          code = d_code(dist);
          send_code(s, code, dtree);
          extra = extra_dbits[code];
          if (extra !== 0) {
            dist -= base_dist[code];
            send_bits(s, dist, extra);
          }
        }
      } while (sx < s.sym_next);
    }
    send_code(s, END_BLOCK, ltree);
  };
  var build_tree = (s, desc) => {
    const tree = desc.dyn_tree;
    const stree = desc.stat_desc.static_tree;
    const has_stree = desc.stat_desc.has_stree;
    const elems = desc.stat_desc.elems;
    let n, m;
    let max_code = -1;
    let node;
    s.heap_len = 0;
    s.heap_max = HEAP_SIZE$1;
    for (n = 0; n < elems; n++) {
      if (tree[n * 2] !== 0) {
        s.heap[++s.heap_len] = max_code = n;
        s.depth[n] = 0;
      } else {
        tree[n * 2 + 1] = 0;
      }
    }
    while (s.heap_len < 2) {
      node = s.heap[++s.heap_len] = max_code < 2 ? ++max_code : 0;
      tree[node * 2] = 1;
      s.depth[node] = 0;
      s.opt_len--;
      if (has_stree) {
        s.static_len -= stree[node * 2 + 1];
      }
    }
    desc.max_code = max_code;
    for (n = s.heap_len >> 1; n >= 1; n--) {
      pqdownheap(s, tree, n);
    }
    node = elems;
    do {
      n = s.heap[
        1
        /*SMALLEST*/
      ];
      s.heap[
        1
        /*SMALLEST*/
      ] = s.heap[s.heap_len--];
      pqdownheap(
        s,
        tree,
        1
        /*SMALLEST*/
      );
      m = s.heap[
        1
        /*SMALLEST*/
      ];
      s.heap[--s.heap_max] = n;
      s.heap[--s.heap_max] = m;
      tree[node * 2] = tree[n * 2] + tree[m * 2];
      s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
      tree[n * 2 + 1] = tree[m * 2 + 1] = node;
      s.heap[
        1
        /*SMALLEST*/
      ] = node++;
      pqdownheap(
        s,
        tree,
        1
        /*SMALLEST*/
      );
    } while (s.heap_len >= 2);
    s.heap[--s.heap_max] = s.heap[
      1
      /*SMALLEST*/
    ];
    gen_bitlen(s, desc);
    gen_codes(tree, max_code, s.bl_count);
  };
  var scan_tree = (s, tree, max_code) => {
    let n;
    let prevlen = -1;
    let curlen;
    let nextlen = tree[0 * 2 + 1];
    let count = 0;
    let max_count = 7;
    let min_count = 4;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;
    }
    tree[(max_code + 1) * 2 + 1] = 65535;
    for (n = 0; n <= max_code; n++) {
      curlen = nextlen;
      nextlen = tree[(n + 1) * 2 + 1];
      if (++count < max_count && curlen === nextlen) {
        continue;
      } else if (count < min_count) {
        s.bl_tree[curlen * 2] += count;
      } else if (curlen !== 0) {
        if (curlen !== prevlen) {
          s.bl_tree[curlen * 2]++;
        }
        s.bl_tree[REP_3_6 * 2]++;
      } else if (count <= 10) {
        s.bl_tree[REPZ_3_10 * 2]++;
      } else {
        s.bl_tree[REPZ_11_138 * 2]++;
      }
      count = 0;
      prevlen = curlen;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      } else if (curlen === nextlen) {
        max_count = 6;
        min_count = 3;
      } else {
        max_count = 7;
        min_count = 4;
      }
    }
  };
  var send_tree = (s, tree, max_code) => {
    let n;
    let prevlen = -1;
    let curlen;
    let nextlen = tree[0 * 2 + 1];
    let count = 0;
    let max_count = 7;
    let min_count = 4;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;
    }
    for (n = 0; n <= max_code; n++) {
      curlen = nextlen;
      nextlen = tree[(n + 1) * 2 + 1];
      if (++count < max_count && curlen === nextlen) {
        continue;
      } else if (count < min_count) {
        do {
          send_code(s, curlen, s.bl_tree);
        } while (--count !== 0);
      } else if (curlen !== 0) {
        if (curlen !== prevlen) {
          send_code(s, curlen, s.bl_tree);
          count--;
        }
        send_code(s, REP_3_6, s.bl_tree);
        send_bits(s, count - 3, 2);
      } else if (count <= 10) {
        send_code(s, REPZ_3_10, s.bl_tree);
        send_bits(s, count - 3, 3);
      } else {
        send_code(s, REPZ_11_138, s.bl_tree);
        send_bits(s, count - 11, 7);
      }
      count = 0;
      prevlen = curlen;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      } else if (curlen === nextlen) {
        max_count = 6;
        min_count = 3;
      } else {
        max_count = 7;
        min_count = 4;
      }
    }
  };
  var build_bl_tree = (s) => {
    let max_blindex;
    scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
    scan_tree(s, s.dyn_dtree, s.d_desc.max_code);
    build_tree(s, s.bl_desc);
    for (max_blindex = BL_CODES$1 - 1; max_blindex >= 3; max_blindex--) {
      if (s.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) {
        break;
      }
    }
    s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
    return max_blindex;
  };
  var send_all_trees = (s, lcodes, dcodes, blcodes) => {
    let rank2;
    send_bits(s, lcodes - 257, 5);
    send_bits(s, dcodes - 1, 5);
    send_bits(s, blcodes - 4, 4);
    for (rank2 = 0; rank2 < blcodes; rank2++) {
      send_bits(s, s.bl_tree[bl_order[rank2] * 2 + 1], 3);
    }
    send_tree(s, s.dyn_ltree, lcodes - 1);
    send_tree(s, s.dyn_dtree, dcodes - 1);
  };
  var detect_data_type = (s) => {
    let block_mask = 4093624447;
    let n;
    for (n = 0; n <= 31; n++, block_mask >>>= 1) {
      if (block_mask & 1 && s.dyn_ltree[n * 2] !== 0) {
        return Z_BINARY;
      }
    }
    if (s.dyn_ltree[9 * 2] !== 0 || s.dyn_ltree[10 * 2] !== 0 || s.dyn_ltree[13 * 2] !== 0) {
      return Z_TEXT;
    }
    for (n = 32; n < LITERALS$1; n++) {
      if (s.dyn_ltree[n * 2] !== 0) {
        return Z_TEXT;
      }
    }
    return Z_BINARY;
  };
  var static_init_done = false;
  var _tr_init$1 = (s) => {
    if (!static_init_done) {
      tr_static_init();
      static_init_done = true;
    }
    s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
    s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
    s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);
    s.bi_buf = 0;
    s.bi_valid = 0;
    init_block(s);
  };
  var _tr_stored_block$1 = (s, buf, stored_len, last) => {
    send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
    bi_windup(s);
    put_short(s, stored_len);
    put_short(s, ~stored_len);
    if (stored_len) {
      s.pending_buf.set(s.window.subarray(buf, buf + stored_len), s.pending);
    }
    s.pending += stored_len;
  };
  var _tr_align$1 = (s) => {
    send_bits(s, STATIC_TREES << 1, 3);
    send_code(s, END_BLOCK, static_ltree);
    bi_flush(s);
  };
  var _tr_flush_block$1 = (s, buf, stored_len, last) => {
    let opt_lenb, static_lenb;
    let max_blindex = 0;
    if (s.level > 0) {
      if (s.strm.data_type === Z_UNKNOWN$1) {
        s.strm.data_type = detect_data_type(s);
      }
      build_tree(s, s.l_desc);
      build_tree(s, s.d_desc);
      max_blindex = build_bl_tree(s);
      opt_lenb = s.opt_len + 3 + 7 >>> 3;
      static_lenb = s.static_len + 3 + 7 >>> 3;
      if (static_lenb <= opt_lenb) {
        opt_lenb = static_lenb;
      }
    } else {
      opt_lenb = static_lenb = stored_len + 5;
    }
    if (stored_len + 4 <= opt_lenb && buf !== -1) {
      _tr_stored_block$1(s, buf, stored_len, last);
    } else if (s.strategy === Z_FIXED$1 || static_lenb === opt_lenb) {
      send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
      compress_block(s, static_ltree, static_dtree);
    } else {
      send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
      send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
      compress_block(s, s.dyn_ltree, s.dyn_dtree);
    }
    init_block(s);
    if (last) {
      bi_windup(s);
    }
  };
  var _tr_tally$1 = (s, dist, lc) => {
    s.pending_buf[s.sym_buf + s.sym_next++] = dist;
    s.pending_buf[s.sym_buf + s.sym_next++] = dist >> 8;
    s.pending_buf[s.sym_buf + s.sym_next++] = lc;
    if (dist === 0) {
      s.dyn_ltree[lc * 2]++;
    } else {
      s.matches++;
      dist--;
      s.dyn_ltree[(_length_code[lc] + LITERALS$1 + 1) * 2]++;
      s.dyn_dtree[d_code(dist) * 2]++;
    }
    return s.sym_next === s.sym_end;
  };
  var _tr_init_1 = _tr_init$1;
  var _tr_stored_block_1 = _tr_stored_block$1;
  var _tr_flush_block_1 = _tr_flush_block$1;
  var _tr_tally_1 = _tr_tally$1;
  var _tr_align_1 = _tr_align$1;
  var trees = {
    _tr_init: _tr_init_1,
    _tr_stored_block: _tr_stored_block_1,
    _tr_flush_block: _tr_flush_block_1,
    _tr_tally: _tr_tally_1,
    _tr_align: _tr_align_1
  };
  var adler32 = (adler, buf, len, pos) => {
    let s1 = adler & 65535 | 0, s2 = adler >>> 16 & 65535 | 0, n = 0;
    while (len !== 0) {
      n = len > 2e3 ? 2e3 : len;
      len -= n;
      do {
        s1 = s1 + buf[pos++] | 0;
        s2 = s2 + s1 | 0;
      } while (--n);
      s1 %= 65521;
      s2 %= 65521;
    }
    return s1 | s2 << 16 | 0;
  };
  var adler32_1 = adler32;
  var makeTable = () => {
    let c, table = [];
    for (var n = 0; n < 256; n++) {
      c = n;
      for (var k = 0; k < 8; k++) {
        c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
      }
      table[n] = c;
    }
    return table;
  };
  var crcTable = new Uint32Array(makeTable());
  var crc32 = (crc, buf, len, pos) => {
    const t = crcTable;
    const end = pos + len;
    crc ^= -1;
    for (let i = pos; i < end; i++) {
      crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 255];
    }
    return crc ^ -1;
  };
  var crc32_1 = crc32;
  var messages = {
    2: "need dictionary",
    /* Z_NEED_DICT       2  */
    1: "stream end",
    /* Z_STREAM_END      1  */
    0: "",
    /* Z_OK              0  */
    "-1": "file error",
    /* Z_ERRNO         (-1) */
    "-2": "stream error",
    /* Z_STREAM_ERROR  (-2) */
    "-3": "data error",
    /* Z_DATA_ERROR    (-3) */
    "-4": "insufficient memory",
    /* Z_MEM_ERROR     (-4) */
    "-5": "buffer error",
    /* Z_BUF_ERROR     (-5) */
    "-6": "incompatible version"
    /* Z_VERSION_ERROR (-6) */
  };
  var constants$2 = {
    /* Allowed flush values; see deflate() and inflate() below for details */
    Z_NO_FLUSH: 0,
    Z_PARTIAL_FLUSH: 1,
    Z_SYNC_FLUSH: 2,
    Z_FULL_FLUSH: 3,
    Z_FINISH: 4,
    Z_BLOCK: 5,
    Z_TREES: 6,
    /* Return codes for the compression/decompression functions. Negative values
    * are errors, positive values are used for special but normal events.
    */
    Z_OK: 0,
    Z_STREAM_END: 1,
    Z_NEED_DICT: 2,
    Z_ERRNO: -1,
    Z_STREAM_ERROR: -2,
    Z_DATA_ERROR: -3,
    Z_MEM_ERROR: -4,
    Z_BUF_ERROR: -5,
    //Z_VERSION_ERROR: -6,
    /* compression levels */
    Z_NO_COMPRESSION: 0,
    Z_BEST_SPEED: 1,
    Z_BEST_COMPRESSION: 9,
    Z_DEFAULT_COMPRESSION: -1,
    Z_FILTERED: 1,
    Z_HUFFMAN_ONLY: 2,
    Z_RLE: 3,
    Z_FIXED: 4,
    Z_DEFAULT_STRATEGY: 0,
    /* Possible values of the data_type field (though see inflate()) */
    Z_BINARY: 0,
    Z_TEXT: 1,
    //Z_ASCII:                1, // = Z_TEXT (deprecated)
    Z_UNKNOWN: 2,
    /* The deflate compression method */
    Z_DEFLATED: 8
    //Z_NULL:                 null // Use -1 or null inline, depending on var type
  };
  var { _tr_init, _tr_stored_block, _tr_flush_block, _tr_tally, _tr_align } = trees;
  var {
    Z_NO_FLUSH: Z_NO_FLUSH$2,
    Z_PARTIAL_FLUSH,
    Z_FULL_FLUSH: Z_FULL_FLUSH$1,
    Z_FINISH: Z_FINISH$3,
    Z_BLOCK: Z_BLOCK$1,
    Z_OK: Z_OK$3,
    Z_STREAM_END: Z_STREAM_END$3,
    Z_STREAM_ERROR: Z_STREAM_ERROR$2,
    Z_DATA_ERROR: Z_DATA_ERROR$2,
    Z_BUF_ERROR: Z_BUF_ERROR$1,
    Z_DEFAULT_COMPRESSION: Z_DEFAULT_COMPRESSION$1,
    Z_FILTERED,
    Z_HUFFMAN_ONLY,
    Z_RLE,
    Z_FIXED,
    Z_DEFAULT_STRATEGY: Z_DEFAULT_STRATEGY$1,
    Z_UNKNOWN,
    Z_DEFLATED: Z_DEFLATED$2
  } = constants$2;
  var MAX_MEM_LEVEL = 9;
  var MAX_WBITS$1 = 15;
  var DEF_MEM_LEVEL = 8;
  var LENGTH_CODES = 29;
  var LITERALS = 256;
  var L_CODES = LITERALS + 1 + LENGTH_CODES;
  var D_CODES = 30;
  var BL_CODES = 19;
  var HEAP_SIZE = 2 * L_CODES + 1;
  var MAX_BITS = 15;
  var MIN_MATCH = 3;
  var MAX_MATCH = 258;
  var MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1;
  var PRESET_DICT = 32;
  var INIT_STATE = 42;
  var GZIP_STATE = 57;
  var EXTRA_STATE = 69;
  var NAME_STATE = 73;
  var COMMENT_STATE = 91;
  var HCRC_STATE = 103;
  var BUSY_STATE = 113;
  var FINISH_STATE = 666;
  var BS_NEED_MORE = 1;
  var BS_BLOCK_DONE = 2;
  var BS_FINISH_STARTED = 3;
  var BS_FINISH_DONE = 4;
  var OS_CODE = 3;
  var err = (strm, errorCode) => {
    strm.msg = messages[errorCode];
    return errorCode;
  };
  var rank = (f) => {
    return f * 2 - (f > 4 ? 9 : 0);
  };
  var zero = (buf) => {
    let len = buf.length;
    while (--len >= 0) {
      buf[len] = 0;
    }
  };
  var slide_hash = (s) => {
    let n, m;
    let p;
    let wsize = s.w_size;
    n = s.hash_size;
    p = n;
    do {
      m = s.head[--p];
      s.head[p] = m >= wsize ? m - wsize : 0;
    } while (--n);
    n = wsize;
    p = n;
    do {
      m = s.prev[--p];
      s.prev[p] = m >= wsize ? m - wsize : 0;
    } while (--n);
  };
  var HASH_ZLIB = (s, prev, data) => (prev << s.hash_shift ^ data) & s.hash_mask;
  var HASH = HASH_ZLIB;
  var flush_pending = (strm) => {
    const s = strm.state;
    let len = s.pending;
    if (len > strm.avail_out) {
      len = strm.avail_out;
    }
    if (len === 0) {
      return;
    }
    strm.output.set(s.pending_buf.subarray(s.pending_out, s.pending_out + len), strm.next_out);
    strm.next_out += len;
    s.pending_out += len;
    strm.total_out += len;
    strm.avail_out -= len;
    s.pending -= len;
    if (s.pending === 0) {
      s.pending_out = 0;
    }
  };
  var flush_block_only = (s, last) => {
    _tr_flush_block(s, s.block_start >= 0 ? s.block_start : -1, s.strstart - s.block_start, last);
    s.block_start = s.strstart;
    flush_pending(s.strm);
  };
  var put_byte = (s, b) => {
    s.pending_buf[s.pending++] = b;
  };
  var putShortMSB = (s, b) => {
    s.pending_buf[s.pending++] = b >>> 8 & 255;
    s.pending_buf[s.pending++] = b & 255;
  };
  var read_buf = (strm, buf, start, size) => {
    let len = strm.avail_in;
    if (len > size) {
      len = size;
    }
    if (len === 0) {
      return 0;
    }
    strm.avail_in -= len;
    buf.set(strm.input.subarray(strm.next_in, strm.next_in + len), start);
    if (strm.state.wrap === 1) {
      strm.adler = adler32_1(strm.adler, buf, len, start);
    } else if (strm.state.wrap === 2) {
      strm.adler = crc32_1(strm.adler, buf, len, start);
    }
    strm.next_in += len;
    strm.total_in += len;
    return len;
  };
  var longest_match = (s, cur_match) => {
    let chain_length = s.max_chain_length;
    let scan = s.strstart;
    let match;
    let len;
    let best_len = s.prev_length;
    let nice_match = s.nice_match;
    const limit = s.strstart > s.w_size - MIN_LOOKAHEAD ? s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0;
    const _win = s.window;
    const wmask = s.w_mask;
    const prev = s.prev;
    const strend = s.strstart + MAX_MATCH;
    let scan_end1 = _win[scan + best_len - 1];
    let scan_end = _win[scan + best_len];
    if (s.prev_length >= s.good_match) {
      chain_length >>= 2;
    }
    if (nice_match > s.lookahead) {
      nice_match = s.lookahead;
    }
    do {
      match = cur_match;
      if (_win[match + best_len] !== scan_end || _win[match + best_len - 1] !== scan_end1 || _win[match] !== _win[scan] || _win[++match] !== _win[scan + 1]) {
        continue;
      }
      scan += 2;
      match++;
      do {
      } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && scan < strend);
      len = MAX_MATCH - (strend - scan);
      scan = strend - MAX_MATCH;
      if (len > best_len) {
        s.match_start = cur_match;
        best_len = len;
        if (len >= nice_match) {
          break;
        }
        scan_end1 = _win[scan + best_len - 1];
        scan_end = _win[scan + best_len];
      }
    } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);
    if (best_len <= s.lookahead) {
      return best_len;
    }
    return s.lookahead;
  };
  var fill_window = (s) => {
    const _w_size = s.w_size;
    let n, more, str;
    do {
      more = s.window_size - s.lookahead - s.strstart;
      if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {
        s.window.set(s.window.subarray(_w_size, _w_size + _w_size - more), 0);
        s.match_start -= _w_size;
        s.strstart -= _w_size;
        s.block_start -= _w_size;
        if (s.insert > s.strstart) {
          s.insert = s.strstart;
        }
        slide_hash(s);
        more += _w_size;
      }
      if (s.strm.avail_in === 0) {
        break;
      }
      n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
      s.lookahead += n;
      if (s.lookahead + s.insert >= MIN_MATCH) {
        str = s.strstart - s.insert;
        s.ins_h = s.window[str];
        s.ins_h = HASH(s, s.ins_h, s.window[str + 1]);
        while (s.insert) {
          s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
          s.prev[str & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = str;
          str++;
          s.insert--;
          if (s.lookahead + s.insert < MIN_MATCH) {
            break;
          }
        }
      }
    } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);
  };
  var deflate_stored = (s, flush) => {
    let min_block = s.pending_buf_size - 5 > s.w_size ? s.w_size : s.pending_buf_size - 5;
    let len, left, have, last = 0;
    let used = s.strm.avail_in;
    do {
      len = 65535;
      have = s.bi_valid + 42 >> 3;
      if (s.strm.avail_out < have) {
        break;
      }
      have = s.strm.avail_out - have;
      left = s.strstart - s.block_start;
      if (len > left + s.strm.avail_in) {
        len = left + s.strm.avail_in;
      }
      if (len > have) {
        len = have;
      }
      if (len < min_block && (len === 0 && flush !== Z_FINISH$3 || flush === Z_NO_FLUSH$2 || len !== left + s.strm.avail_in)) {
        break;
      }
      last = flush === Z_FINISH$3 && len === left + s.strm.avail_in ? 1 : 0;
      _tr_stored_block(s, 0, 0, last);
      s.pending_buf[s.pending - 4] = len;
      s.pending_buf[s.pending - 3] = len >> 8;
      s.pending_buf[s.pending - 2] = ~len;
      s.pending_buf[s.pending - 1] = ~len >> 8;
      flush_pending(s.strm);
      if (left) {
        if (left > len) {
          left = len;
        }
        s.strm.output.set(s.window.subarray(s.block_start, s.block_start + left), s.strm.next_out);
        s.strm.next_out += left;
        s.strm.avail_out -= left;
        s.strm.total_out += left;
        s.block_start += left;
        len -= left;
      }
      if (len) {
        read_buf(s.strm, s.strm.output, s.strm.next_out, len);
        s.strm.next_out += len;
        s.strm.avail_out -= len;
        s.strm.total_out += len;
      }
    } while (last === 0);
    used -= s.strm.avail_in;
    if (used) {
      if (used >= s.w_size) {
        s.matches = 2;
        s.window.set(s.strm.input.subarray(s.strm.next_in - s.w_size, s.strm.next_in), 0);
        s.strstart = s.w_size;
        s.insert = s.strstart;
      } else {
        if (s.window_size - s.strstart <= used) {
          s.strstart -= s.w_size;
          s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
          if (s.matches < 2) {
            s.matches++;
          }
          if (s.insert > s.strstart) {
            s.insert = s.strstart;
          }
        }
        s.window.set(s.strm.input.subarray(s.strm.next_in - used, s.strm.next_in), s.strstart);
        s.strstart += used;
        s.insert += used > s.w_size - s.insert ? s.w_size - s.insert : used;
      }
      s.block_start = s.strstart;
    }
    if (s.high_water < s.strstart) {
      s.high_water = s.strstart;
    }
    if (last) {
      return BS_FINISH_DONE;
    }
    if (flush !== Z_NO_FLUSH$2 && flush !== Z_FINISH$3 && s.strm.avail_in === 0 && s.strstart === s.block_start) {
      return BS_BLOCK_DONE;
    }
    have = s.window_size - s.strstart;
    if (s.strm.avail_in > have && s.block_start >= s.w_size) {
      s.block_start -= s.w_size;
      s.strstart -= s.w_size;
      s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
      if (s.matches < 2) {
        s.matches++;
      }
      have += s.w_size;
      if (s.insert > s.strstart) {
        s.insert = s.strstart;
      }
    }
    if (have > s.strm.avail_in) {
      have = s.strm.avail_in;
    }
    if (have) {
      read_buf(s.strm, s.window, s.strstart, have);
      s.strstart += have;
      s.insert += have > s.w_size - s.insert ? s.w_size - s.insert : have;
    }
    if (s.high_water < s.strstart) {
      s.high_water = s.strstart;
    }
    have = s.bi_valid + 42 >> 3;
    have = s.pending_buf_size - have > 65535 ? 65535 : s.pending_buf_size - have;
    min_block = have > s.w_size ? s.w_size : have;
    left = s.strstart - s.block_start;
    if (left >= min_block || (left || flush === Z_FINISH$3) && flush !== Z_NO_FLUSH$2 && s.strm.avail_in === 0 && left <= have) {
      len = left > have ? have : left;
      last = flush === Z_FINISH$3 && s.strm.avail_in === 0 && len === left ? 1 : 0;
      _tr_stored_block(s, s.block_start, len, last);
      s.block_start += len;
      flush_pending(s.strm);
    }
    return last ? BS_FINISH_STARTED : BS_NEED_MORE;
  };
  var deflate_fast = (s, flush) => {
    let hash_head;
    let bflush;
    for (; ; ) {
      if (s.lookahead < MIN_LOOKAHEAD) {
        fill_window(s);
        if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH$2) {
          return BS_NEED_MORE;
        }
        if (s.lookahead === 0) {
          break;
        }
      }
      hash_head = 0;
      if (s.lookahead >= MIN_MATCH) {
        s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
        hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
        s.head[s.ins_h] = s.strstart;
      }
      if (hash_head !== 0 && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
        s.match_length = longest_match(s, hash_head);
      }
      if (s.match_length >= MIN_MATCH) {
        bflush = _tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);
        s.lookahead -= s.match_length;
        if (s.match_length <= s.max_lazy_match && s.lookahead >= MIN_MATCH) {
          s.match_length--;
          do {
            s.strstart++;
            s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
            hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
            s.head[s.ins_h] = s.strstart;
          } while (--s.match_length !== 0);
          s.strstart++;
        } else {
          s.strstart += s.match_length;
          s.match_length = 0;
          s.ins_h = s.window[s.strstart];
          s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + 1]);
        }
      } else {
        bflush = _tr_tally(s, 0, s.window[s.strstart]);
        s.lookahead--;
        s.strstart++;
      }
      if (bflush) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
    }
    s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
    if (flush === Z_FINISH$3) {
      flush_block_only(s, true);
      if (s.strm.avail_out === 0) {
        return BS_FINISH_STARTED;
      }
      return BS_FINISH_DONE;
    }
    if (s.sym_next) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
    return BS_BLOCK_DONE;
  };
  var deflate_slow = (s, flush) => {
    let hash_head;
    let bflush;
    let max_insert;
    for (; ; ) {
      if (s.lookahead < MIN_LOOKAHEAD) {
        fill_window(s);
        if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH$2) {
          return BS_NEED_MORE;
        }
        if (s.lookahead === 0) {
          break;
        }
      }
      hash_head = 0;
      if (s.lookahead >= MIN_MATCH) {
        s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
        hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
        s.head[s.ins_h] = s.strstart;
      }
      s.prev_length = s.match_length;
      s.prev_match = s.match_start;
      s.match_length = MIN_MATCH - 1;
      if (hash_head !== 0 && s.prev_length < s.max_lazy_match && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
        s.match_length = longest_match(s, hash_head);
        if (s.match_length <= 5 && (s.strategy === Z_FILTERED || s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096)) {
          s.match_length = MIN_MATCH - 1;
        }
      }
      if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
        max_insert = s.strstart + s.lookahead - MIN_MATCH;
        bflush = _tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
        s.lookahead -= s.prev_length - 1;
        s.prev_length -= 2;
        do {
          if (++s.strstart <= max_insert) {
            s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
            hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
            s.head[s.ins_h] = s.strstart;
          }
        } while (--s.prev_length !== 0);
        s.match_available = 0;
        s.match_length = MIN_MATCH - 1;
        s.strstart++;
        if (bflush) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      } else if (s.match_available) {
        bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
        if (bflush) {
          flush_block_only(s, false);
        }
        s.strstart++;
        s.lookahead--;
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      } else {
        s.match_available = 1;
        s.strstart++;
        s.lookahead--;
      }
    }
    if (s.match_available) {
      bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
      s.match_available = 0;
    }
    s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
    if (flush === Z_FINISH$3) {
      flush_block_only(s, true);
      if (s.strm.avail_out === 0) {
        return BS_FINISH_STARTED;
      }
      return BS_FINISH_DONE;
    }
    if (s.sym_next) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
    return BS_BLOCK_DONE;
  };
  var deflate_rle = (s, flush) => {
    let bflush;
    let prev;
    let scan, strend;
    const _win = s.window;
    for (; ; ) {
      if (s.lookahead <= MAX_MATCH) {
        fill_window(s);
        if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH$2) {
          return BS_NEED_MORE;
        }
        if (s.lookahead === 0) {
          break;
        }
      }
      s.match_length = 0;
      if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
        scan = s.strstart - 1;
        prev = _win[scan];
        if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
          strend = s.strstart + MAX_MATCH;
          do {
          } while (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && scan < strend);
          s.match_length = MAX_MATCH - (strend - scan);
          if (s.match_length > s.lookahead) {
            s.match_length = s.lookahead;
          }
        }
      }
      if (s.match_length >= MIN_MATCH) {
        bflush = _tr_tally(s, 1, s.match_length - MIN_MATCH);
        s.lookahead -= s.match_length;
        s.strstart += s.match_length;
        s.match_length = 0;
      } else {
        bflush = _tr_tally(s, 0, s.window[s.strstart]);
        s.lookahead--;
        s.strstart++;
      }
      if (bflush) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
    }
    s.insert = 0;
    if (flush === Z_FINISH$3) {
      flush_block_only(s, true);
      if (s.strm.avail_out === 0) {
        return BS_FINISH_STARTED;
      }
      return BS_FINISH_DONE;
    }
    if (s.sym_next) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
    return BS_BLOCK_DONE;
  };
  var deflate_huff = (s, flush) => {
    let bflush;
    for (; ; ) {
      if (s.lookahead === 0) {
        fill_window(s);
        if (s.lookahead === 0) {
          if (flush === Z_NO_FLUSH$2) {
            return BS_NEED_MORE;
          }
          break;
        }
      }
      s.match_length = 0;
      bflush = _tr_tally(s, 0, s.window[s.strstart]);
      s.lookahead--;
      s.strstart++;
      if (bflush) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
    }
    s.insert = 0;
    if (flush === Z_FINISH$3) {
      flush_block_only(s, true);
      if (s.strm.avail_out === 0) {
        return BS_FINISH_STARTED;
      }
      return BS_FINISH_DONE;
    }
    if (s.sym_next) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
    return BS_BLOCK_DONE;
  };
  function Config(good_length, max_lazy, nice_length, max_chain, func) {
    this.good_length = good_length;
    this.max_lazy = max_lazy;
    this.nice_length = nice_length;
    this.max_chain = max_chain;
    this.func = func;
  }
  var configuration_table = [
    /*      good lazy nice chain */
    new Config(0, 0, 0, 0, deflate_stored),
    /* 0 store only */
    new Config(4, 4, 8, 4, deflate_fast),
    /* 1 max speed, no lazy matches */
    new Config(4, 5, 16, 8, deflate_fast),
    /* 2 */
    new Config(4, 6, 32, 32, deflate_fast),
    /* 3 */
    new Config(4, 4, 16, 16, deflate_slow),
    /* 4 lazy matches */
    new Config(8, 16, 32, 32, deflate_slow),
    /* 5 */
    new Config(8, 16, 128, 128, deflate_slow),
    /* 6 */
    new Config(8, 32, 128, 256, deflate_slow),
    /* 7 */
    new Config(32, 128, 258, 1024, deflate_slow),
    /* 8 */
    new Config(32, 258, 258, 4096, deflate_slow)
    /* 9 max compression */
  ];
  var lm_init = (s) => {
    s.window_size = 2 * s.w_size;
    zero(s.head);
    s.max_lazy_match = configuration_table[s.level].max_lazy;
    s.good_match = configuration_table[s.level].good_length;
    s.nice_match = configuration_table[s.level].nice_length;
    s.max_chain_length = configuration_table[s.level].max_chain;
    s.strstart = 0;
    s.block_start = 0;
    s.lookahead = 0;
    s.insert = 0;
    s.match_length = s.prev_length = MIN_MATCH - 1;
    s.match_available = 0;
    s.ins_h = 0;
  };
  function DeflateState() {
    this.strm = null;
    this.status = 0;
    this.pending_buf = null;
    this.pending_buf_size = 0;
    this.pending_out = 0;
    this.pending = 0;
    this.wrap = 0;
    this.gzhead = null;
    this.gzindex = 0;
    this.method = Z_DEFLATED$2;
    this.last_flush = -1;
    this.w_size = 0;
    this.w_bits = 0;
    this.w_mask = 0;
    this.window = null;
    this.window_size = 0;
    this.prev = null;
    this.head = null;
    this.ins_h = 0;
    this.hash_size = 0;
    this.hash_bits = 0;
    this.hash_mask = 0;
    this.hash_shift = 0;
    this.block_start = 0;
    this.match_length = 0;
    this.prev_match = 0;
    this.match_available = 0;
    this.strstart = 0;
    this.match_start = 0;
    this.lookahead = 0;
    this.prev_length = 0;
    this.max_chain_length = 0;
    this.max_lazy_match = 0;
    this.level = 0;
    this.strategy = 0;
    this.good_match = 0;
    this.nice_match = 0;
    this.dyn_ltree = new Uint16Array(HEAP_SIZE * 2);
    this.dyn_dtree = new Uint16Array((2 * D_CODES + 1) * 2);
    this.bl_tree = new Uint16Array((2 * BL_CODES + 1) * 2);
    zero(this.dyn_ltree);
    zero(this.dyn_dtree);
    zero(this.bl_tree);
    this.l_desc = null;
    this.d_desc = null;
    this.bl_desc = null;
    this.bl_count = new Uint16Array(MAX_BITS + 1);
    this.heap = new Uint16Array(2 * L_CODES + 1);
    zero(this.heap);
    this.heap_len = 0;
    this.heap_max = 0;
    this.depth = new Uint16Array(2 * L_CODES + 1);
    zero(this.depth);
    this.sym_buf = 0;
    this.lit_bufsize = 0;
    this.sym_next = 0;
    this.sym_end = 0;
    this.opt_len = 0;
    this.static_len = 0;
    this.matches = 0;
    this.insert = 0;
    this.bi_buf = 0;
    this.bi_valid = 0;
  }
  var deflateStateCheck = (strm) => {
    if (!strm) {
      return 1;
    }
    const s = strm.state;
    if (!s || s.strm !== strm || s.status !== INIT_STATE && //#ifdef GZIP
    s.status !== GZIP_STATE && //#endif
    s.status !== EXTRA_STATE && s.status !== NAME_STATE && s.status !== COMMENT_STATE && s.status !== HCRC_STATE && s.status !== BUSY_STATE && s.status !== FINISH_STATE) {
      return 1;
    }
    return 0;
  };
  var deflateResetKeep = (strm) => {
    if (deflateStateCheck(strm)) {
      return err(strm, Z_STREAM_ERROR$2);
    }
    strm.total_in = strm.total_out = 0;
    strm.data_type = Z_UNKNOWN;
    const s = strm.state;
    s.pending = 0;
    s.pending_out = 0;
    if (s.wrap < 0) {
      s.wrap = -s.wrap;
    }
    s.status = //#ifdef GZIP
    s.wrap === 2 ? GZIP_STATE : (
      //#endif
      s.wrap ? INIT_STATE : BUSY_STATE
    );
    strm.adler = s.wrap === 2 ? 0 : 1;
    s.last_flush = -2;
    _tr_init(s);
    return Z_OK$3;
  };
  var deflateReset = (strm) => {
    const ret = deflateResetKeep(strm);
    if (ret === Z_OK$3) {
      lm_init(strm.state);
    }
    return ret;
  };
  var deflateSetHeader = (strm, head) => {
    if (deflateStateCheck(strm) || strm.state.wrap !== 2) {
      return Z_STREAM_ERROR$2;
    }
    strm.state.gzhead = head;
    return Z_OK$3;
  };
  var deflateInit2 = (strm, level, method, windowBits, memLevel, strategy) => {
    if (!strm) {
      return Z_STREAM_ERROR$2;
    }
    let wrap = 1;
    if (level === Z_DEFAULT_COMPRESSION$1) {
      level = 6;
    }
    if (windowBits < 0) {
      wrap = 0;
      windowBits = -windowBits;
    } else if (windowBits > 15) {
      wrap = 2;
      windowBits -= 16;
    }
    if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED$2 || windowBits < 8 || windowBits > 15 || level < 0 || level > 9 || strategy < 0 || strategy > Z_FIXED || windowBits === 8 && wrap !== 1) {
      return err(strm, Z_STREAM_ERROR$2);
    }
    if (windowBits === 8) {
      windowBits = 9;
    }
    const s = new DeflateState();
    strm.state = s;
    s.strm = strm;
    s.status = INIT_STATE;
    s.wrap = wrap;
    s.gzhead = null;
    s.w_bits = windowBits;
    s.w_size = 1 << s.w_bits;
    s.w_mask = s.w_size - 1;
    s.hash_bits = memLevel + 7;
    s.hash_size = 1 << s.hash_bits;
    s.hash_mask = s.hash_size - 1;
    s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);
    s.window = new Uint8Array(s.w_size * 2);
    s.head = new Uint16Array(s.hash_size);
    s.prev = new Uint16Array(s.w_size);
    s.lit_bufsize = 1 << memLevel + 6;
    s.pending_buf_size = s.lit_bufsize * 4;
    s.pending_buf = new Uint8Array(s.pending_buf_size);
    s.sym_buf = s.lit_bufsize;
    s.sym_end = (s.lit_bufsize - 1) * 3;
    s.level = level;
    s.strategy = strategy;
    s.method = method;
    return deflateReset(strm);
  };
  var deflateInit = (strm, level) => {
    return deflateInit2(strm, level, Z_DEFLATED$2, MAX_WBITS$1, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY$1);
  };
  var deflate$2 = (strm, flush) => {
    if (deflateStateCheck(strm) || flush > Z_BLOCK$1 || flush < 0) {
      return strm ? err(strm, Z_STREAM_ERROR$2) : Z_STREAM_ERROR$2;
    }
    const s = strm.state;
    if (!strm.output || strm.avail_in !== 0 && !strm.input || s.status === FINISH_STATE && flush !== Z_FINISH$3) {
      return err(strm, strm.avail_out === 0 ? Z_BUF_ERROR$1 : Z_STREAM_ERROR$2);
    }
    const old_flush = s.last_flush;
    s.last_flush = flush;
    if (s.pending !== 0) {
      flush_pending(strm);
      if (strm.avail_out === 0) {
        s.last_flush = -1;
        return Z_OK$3;
      }
    } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) && flush !== Z_FINISH$3) {
      return err(strm, Z_BUF_ERROR$1);
    }
    if (s.status === FINISH_STATE && strm.avail_in !== 0) {
      return err(strm, Z_BUF_ERROR$1);
    }
    if (s.status === INIT_STATE && s.wrap === 0) {
      s.status = BUSY_STATE;
    }
    if (s.status === INIT_STATE) {
      let header = Z_DEFLATED$2 + (s.w_bits - 8 << 4) << 8;
      let level_flags = -1;
      if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
        level_flags = 0;
      } else if (s.level < 6) {
        level_flags = 1;
      } else if (s.level === 6) {
        level_flags = 2;
      } else {
        level_flags = 3;
      }
      header |= level_flags << 6;
      if (s.strstart !== 0) {
        header |= PRESET_DICT;
      }
      header += 31 - header % 31;
      putShortMSB(s, header);
      if (s.strstart !== 0) {
        putShortMSB(s, strm.adler >>> 16);
        putShortMSB(s, strm.adler & 65535);
      }
      strm.adler = 1;
      s.status = BUSY_STATE;
      flush_pending(strm);
      if (s.pending !== 0) {
        s.last_flush = -1;
        return Z_OK$3;
      }
    }
    if (s.status === GZIP_STATE) {
      strm.adler = 0;
      put_byte(s, 31);
      put_byte(s, 139);
      put_byte(s, 8);
      if (!s.gzhead) {
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
        put_byte(s, OS_CODE);
        s.status = BUSY_STATE;
        flush_pending(strm);
        if (s.pending !== 0) {
          s.last_flush = -1;
          return Z_OK$3;
        }
      } else {
        put_byte(
          s,
          (s.gzhead.text ? 1 : 0) + (s.gzhead.hcrc ? 2 : 0) + (!s.gzhead.extra ? 0 : 4) + (!s.gzhead.name ? 0 : 8) + (!s.gzhead.comment ? 0 : 16)
        );
        put_byte(s, s.gzhead.time & 255);
        put_byte(s, s.gzhead.time >> 8 & 255);
        put_byte(s, s.gzhead.time >> 16 & 255);
        put_byte(s, s.gzhead.time >> 24 & 255);
        put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
        put_byte(s, s.gzhead.os & 255);
        if (s.gzhead.extra && s.gzhead.extra.length) {
          put_byte(s, s.gzhead.extra.length & 255);
          put_byte(s, s.gzhead.extra.length >> 8 & 255);
        }
        if (s.gzhead.hcrc) {
          strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending, 0);
        }
        s.gzindex = 0;
        s.status = EXTRA_STATE;
      }
    }
    if (s.status === EXTRA_STATE) {
      if (s.gzhead.extra) {
        let beg = s.pending;
        let left = (s.gzhead.extra.length & 65535) - s.gzindex;
        while (s.pending + left > s.pending_buf_size) {
          let copy = s.pending_buf_size - s.pending;
          s.pending_buf.set(s.gzhead.extra.subarray(s.gzindex, s.gzindex + copy), s.pending);
          s.pending = s.pending_buf_size;
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          s.gzindex += copy;
          flush_pending(strm);
          if (s.pending !== 0) {
            s.last_flush = -1;
            return Z_OK$3;
          }
          beg = 0;
          left -= copy;
        }
        let gzhead_extra = new Uint8Array(s.gzhead.extra);
        s.pending_buf.set(gzhead_extra.subarray(s.gzindex, s.gzindex + left), s.pending);
        s.pending += left;
        if (s.gzhead.hcrc && s.pending > beg) {
          strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
        }
        s.gzindex = 0;
      }
      s.status = NAME_STATE;
    }
    if (s.status === NAME_STATE) {
      if (s.gzhead.name) {
        let beg = s.pending;
        let val;
        do {
          if (s.pending === s.pending_buf_size) {
            if (s.gzhead.hcrc && s.pending > beg) {
              strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
            }
            flush_pending(strm);
            if (s.pending !== 0) {
              s.last_flush = -1;
              return Z_OK$3;
            }
            beg = 0;
          }
          if (s.gzindex < s.gzhead.name.length) {
            val = s.gzhead.name.charCodeAt(s.gzindex++) & 255;
          } else {
            val = 0;
          }
          put_byte(s, val);
        } while (val !== 0);
        if (s.gzhead.hcrc && s.pending > beg) {
          strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
        }
        s.gzindex = 0;
      }
      s.status = COMMENT_STATE;
    }
    if (s.status === COMMENT_STATE) {
      if (s.gzhead.comment) {
        let beg = s.pending;
        let val;
        do {
          if (s.pending === s.pending_buf_size) {
            if (s.gzhead.hcrc && s.pending > beg) {
              strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
            }
            flush_pending(strm);
            if (s.pending !== 0) {
              s.last_flush = -1;
              return Z_OK$3;
            }
            beg = 0;
          }
          if (s.gzindex < s.gzhead.comment.length) {
            val = s.gzhead.comment.charCodeAt(s.gzindex++) & 255;
          } else {
            val = 0;
          }
          put_byte(s, val);
        } while (val !== 0);
        if (s.gzhead.hcrc && s.pending > beg) {
          strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
        }
      }
      s.status = HCRC_STATE;
    }
    if (s.status === HCRC_STATE) {
      if (s.gzhead.hcrc) {
        if (s.pending + 2 > s.pending_buf_size) {
          flush_pending(strm);
          if (s.pending !== 0) {
            s.last_flush = -1;
            return Z_OK$3;
          }
        }
        put_byte(s, strm.adler & 255);
        put_byte(s, strm.adler >> 8 & 255);
        strm.adler = 0;
      }
      s.status = BUSY_STATE;
      flush_pending(strm);
      if (s.pending !== 0) {
        s.last_flush = -1;
        return Z_OK$3;
      }
    }
    if (strm.avail_in !== 0 || s.lookahead !== 0 || flush !== Z_NO_FLUSH$2 && s.status !== FINISH_STATE) {
      let bstate = s.level === 0 ? deflate_stored(s, flush) : s.strategy === Z_HUFFMAN_ONLY ? deflate_huff(s, flush) : s.strategy === Z_RLE ? deflate_rle(s, flush) : configuration_table[s.level].func(s, flush);
      if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
        s.status = FINISH_STATE;
      }
      if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
        if (strm.avail_out === 0) {
          s.last_flush = -1;
        }
        return Z_OK$3;
      }
      if (bstate === BS_BLOCK_DONE) {
        if (flush === Z_PARTIAL_FLUSH) {
          _tr_align(s);
        } else if (flush !== Z_BLOCK$1) {
          _tr_stored_block(s, 0, 0, false);
          if (flush === Z_FULL_FLUSH$1) {
            zero(s.head);
            if (s.lookahead === 0) {
              s.strstart = 0;
              s.block_start = 0;
              s.insert = 0;
            }
          }
        }
        flush_pending(strm);
        if (strm.avail_out === 0) {
          s.last_flush = -1;
          return Z_OK$3;
        }
      }
    }
    if (flush !== Z_FINISH$3) {
      return Z_OK$3;
    }
    if (s.wrap <= 0) {
      return Z_STREAM_END$3;
    }
    if (s.wrap === 2) {
      put_byte(s, strm.adler & 255);
      put_byte(s, strm.adler >> 8 & 255);
      put_byte(s, strm.adler >> 16 & 255);
      put_byte(s, strm.adler >> 24 & 255);
      put_byte(s, strm.total_in & 255);
      put_byte(s, strm.total_in >> 8 & 255);
      put_byte(s, strm.total_in >> 16 & 255);
      put_byte(s, strm.total_in >> 24 & 255);
    } else {
      putShortMSB(s, strm.adler >>> 16);
      putShortMSB(s, strm.adler & 65535);
    }
    flush_pending(strm);
    if (s.wrap > 0) {
      s.wrap = -s.wrap;
    }
    return s.pending !== 0 ? Z_OK$3 : Z_STREAM_END$3;
  };
  var deflateEnd = (strm) => {
    if (deflateStateCheck(strm)) {
      return Z_STREAM_ERROR$2;
    }
    const status = strm.state.status;
    strm.state = null;
    return status === BUSY_STATE ? err(strm, Z_DATA_ERROR$2) : Z_OK$3;
  };
  var deflateSetDictionary = (strm, dictionary) => {
    let dictLength = dictionary.length;
    if (deflateStateCheck(strm)) {
      return Z_STREAM_ERROR$2;
    }
    const s = strm.state;
    const wrap = s.wrap;
    if (wrap === 2 || wrap === 1 && s.status !== INIT_STATE || s.lookahead) {
      return Z_STREAM_ERROR$2;
    }
    if (wrap === 1) {
      strm.adler = adler32_1(strm.adler, dictionary, dictLength, 0);
    }
    s.wrap = 0;
    if (dictLength >= s.w_size) {
      if (wrap === 0) {
        zero(s.head);
        s.strstart = 0;
        s.block_start = 0;
        s.insert = 0;
      }
      let tmpDict = new Uint8Array(s.w_size);
      tmpDict.set(dictionary.subarray(dictLength - s.w_size, dictLength), 0);
      dictionary = tmpDict;
      dictLength = s.w_size;
    }
    const avail = strm.avail_in;
    const next = strm.next_in;
    const input = strm.input;
    strm.avail_in = dictLength;
    strm.next_in = 0;
    strm.input = dictionary;
    fill_window(s);
    while (s.lookahead >= MIN_MATCH) {
      let str = s.strstart;
      let n = s.lookahead - (MIN_MATCH - 1);
      do {
        s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
        s.prev[str & s.w_mask] = s.head[s.ins_h];
        s.head[s.ins_h] = str;
        str++;
      } while (--n);
      s.strstart = str;
      s.lookahead = MIN_MATCH - 1;
      fill_window(s);
    }
    s.strstart += s.lookahead;
    s.block_start = s.strstart;
    s.insert = s.lookahead;
    s.lookahead = 0;
    s.match_length = s.prev_length = MIN_MATCH - 1;
    s.match_available = 0;
    strm.next_in = next;
    strm.input = input;
    strm.avail_in = avail;
    s.wrap = wrap;
    return Z_OK$3;
  };
  var deflateInit_1 = deflateInit;
  var deflateInit2_1 = deflateInit2;
  var deflateReset_1 = deflateReset;
  var deflateResetKeep_1 = deflateResetKeep;
  var deflateSetHeader_1 = deflateSetHeader;
  var deflate_2$1 = deflate$2;
  var deflateEnd_1 = deflateEnd;
  var deflateSetDictionary_1 = deflateSetDictionary;
  var deflateInfo = "pako deflate (from Nodeca project)";
  var deflate_1$2 = {
    deflateInit: deflateInit_1,
    deflateInit2: deflateInit2_1,
    deflateReset: deflateReset_1,
    deflateResetKeep: deflateResetKeep_1,
    deflateSetHeader: deflateSetHeader_1,
    deflate: deflate_2$1,
    deflateEnd: deflateEnd_1,
    deflateSetDictionary: deflateSetDictionary_1,
    deflateInfo
  };
  var _has = (obj, key) => {
    return Object.prototype.hasOwnProperty.call(obj, key);
  };
  var assign = function(obj) {
    const sources = Array.prototype.slice.call(arguments, 1);
    while (sources.length) {
      const source = sources.shift();
      if (!source) {
        continue;
      }
      if (typeof source !== "object") {
        throw new TypeError(source + "must be non-object");
      }
      for (const p in source) {
        if (_has(source, p)) {
          obj[p] = source[p];
        }
      }
    }
    return obj;
  };
  var flattenChunks = (chunks) => {
    let len = 0;
    for (let i = 0, l = chunks.length; i < l; i++) {
      len += chunks[i].length;
    }
    const result = new Uint8Array(len);
    for (let i = 0, pos = 0, l = chunks.length; i < l; i++) {
      let chunk = chunks[i];
      result.set(chunk, pos);
      pos += chunk.length;
    }
    return result;
  };
  var common = {
    assign,
    flattenChunks
  };
  var STR_APPLY_UIA_OK = true;
  try {
    String.fromCharCode.apply(null, new Uint8Array(1));
  } catch (__) {
    STR_APPLY_UIA_OK = false;
  }
  var _utf8len = new Uint8Array(256);
  for (let q = 0; q < 256; q++) {
    _utf8len[q] = q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1;
  }
  _utf8len[254] = _utf8len[254] = 1;
  var string2buf = (str) => {
    if (typeof TextEncoder === "function" && TextEncoder.prototype.encode) {
      return new TextEncoder().encode(str);
    }
    let buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;
    for (m_pos = 0; m_pos < str_len; m_pos++) {
      c = str.charCodeAt(m_pos);
      if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
        c2 = str.charCodeAt(m_pos + 1);
        if ((c2 & 64512) === 56320) {
          c = 65536 + (c - 55296 << 10) + (c2 - 56320);
          m_pos++;
        }
      }
      buf_len += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
    }
    buf = new Uint8Array(buf_len);
    for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
      c = str.charCodeAt(m_pos);
      if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
        c2 = str.charCodeAt(m_pos + 1);
        if ((c2 & 64512) === 56320) {
          c = 65536 + (c - 55296 << 10) + (c2 - 56320);
          m_pos++;
        }
      }
      if (c < 128) {
        buf[i++] = c;
      } else if (c < 2048) {
        buf[i++] = 192 | c >>> 6;
        buf[i++] = 128 | c & 63;
      } else if (c < 65536) {
        buf[i++] = 224 | c >>> 12;
        buf[i++] = 128 | c >>> 6 & 63;
        buf[i++] = 128 | c & 63;
      } else {
        buf[i++] = 240 | c >>> 18;
        buf[i++] = 128 | c >>> 12 & 63;
        buf[i++] = 128 | c >>> 6 & 63;
        buf[i++] = 128 | c & 63;
      }
    }
    return buf;
  };
  var buf2binstring = (buf, len) => {
    if (len < 65534) {
      if (buf.subarray && STR_APPLY_UIA_OK) {
        return String.fromCharCode.apply(null, buf.length === len ? buf : buf.subarray(0, len));
      }
    }
    let result = "";
    for (let i = 0; i < len; i++) {
      result += String.fromCharCode(buf[i]);
    }
    return result;
  };
  var buf2string = (buf, max) => {
    const len = max || buf.length;
    if (typeof TextDecoder === "function" && TextDecoder.prototype.decode) {
      return new TextDecoder().decode(buf.subarray(0, max));
    }
    let i, out;
    const utf16buf = new Array(len * 2);
    for (out = 0, i = 0; i < len; ) {
      let c = buf[i++];
      if (c < 128) {
        utf16buf[out++] = c;
        continue;
      }
      let c_len = _utf8len[c];
      if (c_len > 4) {
        utf16buf[out++] = 65533;
        i += c_len - 1;
        continue;
      }
      c &= c_len === 2 ? 31 : c_len === 3 ? 15 : 7;
      while (c_len > 1 && i < len) {
        c = c << 6 | buf[i++] & 63;
        c_len--;
      }
      if (c_len > 1) {
        utf16buf[out++] = 65533;
        continue;
      }
      if (c < 65536) {
        utf16buf[out++] = c;
      } else {
        c -= 65536;
        utf16buf[out++] = 55296 | c >> 10 & 1023;
        utf16buf[out++] = 56320 | c & 1023;
      }
    }
    return buf2binstring(utf16buf, out);
  };
  var utf8border = (buf, max) => {
    max = max || buf.length;
    if (max > buf.length) {
      max = buf.length;
    }
    let pos = max - 1;
    while (pos >= 0 && (buf[pos] & 192) === 128) {
      pos--;
    }
    if (pos < 0) {
      return max;
    }
    if (pos === 0) {
      return max;
    }
    return pos + _utf8len[buf[pos]] > max ? pos : max;
  };
  var strings = {
    string2buf,
    buf2string,
    utf8border
  };
  function ZStream() {
    this.input = null;
    this.next_in = 0;
    this.avail_in = 0;
    this.total_in = 0;
    this.output = null;
    this.next_out = 0;
    this.avail_out = 0;
    this.total_out = 0;
    this.msg = "";
    this.state = null;
    this.data_type = 2;
    this.adler = 0;
  }
  var zstream = ZStream;
  var toString$1 = Object.prototype.toString;
  var {
    Z_NO_FLUSH: Z_NO_FLUSH$1,
    Z_SYNC_FLUSH,
    Z_FULL_FLUSH,
    Z_FINISH: Z_FINISH$2,
    Z_OK: Z_OK$2,
    Z_STREAM_END: Z_STREAM_END$2,
    Z_DEFAULT_COMPRESSION,
    Z_DEFAULT_STRATEGY,
    Z_DEFLATED: Z_DEFLATED$1
  } = constants$2;
  function Deflate$1(options) {
    this.options = common.assign({
      level: Z_DEFAULT_COMPRESSION,
      method: Z_DEFLATED$1,
      chunkSize: 16384,
      windowBits: 15,
      memLevel: 8,
      strategy: Z_DEFAULT_STRATEGY
    }, options || {});
    let opt = this.options;
    if (opt.raw && opt.windowBits > 0) {
      opt.windowBits = -opt.windowBits;
    } else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) {
      opt.windowBits += 16;
    }
    this.err = 0;
    this.msg = "";
    this.ended = false;
    this.chunks = [];
    this.strm = new zstream();
    this.strm.avail_out = 0;
    let status = deflate_1$2.deflateInit2(
      this.strm,
      opt.level,
      opt.method,
      opt.windowBits,
      opt.memLevel,
      opt.strategy
    );
    if (status !== Z_OK$2) {
      throw new Error(messages[status]);
    }
    if (opt.header) {
      deflate_1$2.deflateSetHeader(this.strm, opt.header);
    }
    if (opt.dictionary) {
      let dict;
      if (typeof opt.dictionary === "string") {
        dict = strings.string2buf(opt.dictionary);
      } else if (toString$1.call(opt.dictionary) === "[object ArrayBuffer]") {
        dict = new Uint8Array(opt.dictionary);
      } else {
        dict = opt.dictionary;
      }
      status = deflate_1$2.deflateSetDictionary(this.strm, dict);
      if (status !== Z_OK$2) {
        throw new Error(messages[status]);
      }
      this._dict_set = true;
    }
  }
  Deflate$1.prototype.push = function(data, flush_mode) {
    const strm = this.strm;
    const chunkSize = this.options.chunkSize;
    let status, _flush_mode;
    if (this.ended) {
      return false;
    }
    if (flush_mode === ~~flush_mode) _flush_mode = flush_mode;
    else _flush_mode = flush_mode === true ? Z_FINISH$2 : Z_NO_FLUSH$1;
    if (typeof data === "string") {
      strm.input = strings.string2buf(data);
    } else if (toString$1.call(data) === "[object ArrayBuffer]") {
      strm.input = new Uint8Array(data);
    } else {
      strm.input = data;
    }
    strm.next_in = 0;
    strm.avail_in = strm.input.length;
    for (; ; ) {
      if (strm.avail_out === 0) {
        strm.output = new Uint8Array(chunkSize);
        strm.next_out = 0;
        strm.avail_out = chunkSize;
      }
      if ((_flush_mode === Z_SYNC_FLUSH || _flush_mode === Z_FULL_FLUSH) && strm.avail_out <= 6) {
        this.onData(strm.output.subarray(0, strm.next_out));
        strm.avail_out = 0;
        continue;
      }
      status = deflate_1$2.deflate(strm, _flush_mode);
      if (status === Z_STREAM_END$2) {
        if (strm.next_out > 0) {
          this.onData(strm.output.subarray(0, strm.next_out));
        }
        status = deflate_1$2.deflateEnd(this.strm);
        this.onEnd(status);
        this.ended = true;
        return status === Z_OK$2;
      }
      if (strm.avail_out === 0) {
        this.onData(strm.output);
        continue;
      }
      if (_flush_mode > 0 && strm.next_out > 0) {
        this.onData(strm.output.subarray(0, strm.next_out));
        strm.avail_out = 0;
        continue;
      }
      if (strm.avail_in === 0) break;
    }
    return true;
  };
  Deflate$1.prototype.onData = function(chunk) {
    this.chunks.push(chunk);
  };
  Deflate$1.prototype.onEnd = function(status) {
    if (status === Z_OK$2) {
      this.result = common.flattenChunks(this.chunks);
    }
    this.chunks = [];
    this.err = status;
    this.msg = this.strm.msg;
  };
  function deflate$1(input, options) {
    const deflator = new Deflate$1(options);
    deflator.push(input, true);
    if (deflator.err) {
      throw deflator.msg || messages[deflator.err];
    }
    return deflator.result;
  }
  function deflateRaw$1(input, options) {
    options = options || {};
    options.raw = true;
    return deflate$1(input, options);
  }
  function gzip$1(input, options) {
    options = options || {};
    options.gzip = true;
    return deflate$1(input, options);
  }
  var Deflate_1$1 = Deflate$1;
  var deflate_2 = deflate$1;
  var deflateRaw_1$1 = deflateRaw$1;
  var gzip_1$1 = gzip$1;
  var constants$1 = constants$2;
  var deflate_1$1 = {
    Deflate: Deflate_1$1,
    deflate: deflate_2,
    deflateRaw: deflateRaw_1$1,
    gzip: gzip_1$1,
    constants: constants$1
  };
  var BAD$1 = 16209;
  var TYPE$1 = 16191;
  var inffast = function inflate_fast(strm, start) {
    let _in;
    let last;
    let _out;
    let beg;
    let end;
    let dmax;
    let wsize;
    let whave;
    let wnext;
    let s_window;
    let hold;
    let bits;
    let lcode;
    let dcode;
    let lmask;
    let dmask;
    let here;
    let op;
    let len;
    let dist;
    let from;
    let from_source;
    let input, output;
    const state = strm.state;
    _in = strm.next_in;
    input = strm.input;
    last = _in + (strm.avail_in - 5);
    _out = strm.next_out;
    output = strm.output;
    beg = _out - (start - strm.avail_out);
    end = _out + (strm.avail_out - 257);
    dmax = state.dmax;
    wsize = state.wsize;
    whave = state.whave;
    wnext = state.wnext;
    s_window = state.window;
    hold = state.hold;
    bits = state.bits;
    lcode = state.lencode;
    dcode = state.distcode;
    lmask = (1 << state.lenbits) - 1;
    dmask = (1 << state.distbits) - 1;
    top:
      do {
        if (bits < 15) {
          hold += input[_in++] << bits;
          bits += 8;
          hold += input[_in++] << bits;
          bits += 8;
        }
        here = lcode[hold & lmask];
        dolen:
          for (; ; ) {
            op = here >>> 24;
            hold >>>= op;
            bits -= op;
            op = here >>> 16 & 255;
            if (op === 0) {
              output[_out++] = here & 65535;
            } else if (op & 16) {
              len = here & 65535;
              op &= 15;
              if (op) {
                if (bits < op) {
                  hold += input[_in++] << bits;
                  bits += 8;
                }
                len += hold & (1 << op) - 1;
                hold >>>= op;
                bits -= op;
              }
              if (bits < 15) {
                hold += input[_in++] << bits;
                bits += 8;
                hold += input[_in++] << bits;
                bits += 8;
              }
              here = dcode[hold & dmask];
              dodist:
                for (; ; ) {
                  op = here >>> 24;
                  hold >>>= op;
                  bits -= op;
                  op = here >>> 16 & 255;
                  if (op & 16) {
                    dist = here & 65535;
                    op &= 15;
                    if (bits < op) {
                      hold += input[_in++] << bits;
                      bits += 8;
                      if (bits < op) {
                        hold += input[_in++] << bits;
                        bits += 8;
                      }
                    }
                    dist += hold & (1 << op) - 1;
                    if (dist > dmax) {
                      strm.msg = "invalid distance too far back";
                      state.mode = BAD$1;
                      break top;
                    }
                    hold >>>= op;
                    bits -= op;
                    op = _out - beg;
                    if (dist > op) {
                      op = dist - op;
                      if (op > whave) {
                        if (state.sane) {
                          strm.msg = "invalid distance too far back";
                          state.mode = BAD$1;
                          break top;
                        }
                      }
                      from = 0;
                      from_source = s_window;
                      if (wnext === 0) {
                        from += wsize - op;
                        if (op < len) {
                          len -= op;
                          do {
                            output[_out++] = s_window[from++];
                          } while (--op);
                          from = _out - dist;
                          from_source = output;
                        }
                      } else if (wnext < op) {
                        from += wsize + wnext - op;
                        op -= wnext;
                        if (op < len) {
                          len -= op;
                          do {
                            output[_out++] = s_window[from++];
                          } while (--op);
                          from = 0;
                          if (wnext < len) {
                            op = wnext;
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = _out - dist;
                            from_source = output;
                          }
                        }
                      } else {
                        from += wnext - op;
                        if (op < len) {
                          len -= op;
                          do {
                            output[_out++] = s_window[from++];
                          } while (--op);
                          from = _out - dist;
                          from_source = output;
                        }
                      }
                      while (len > 2) {
                        output[_out++] = from_source[from++];
                        output[_out++] = from_source[from++];
                        output[_out++] = from_source[from++];
                        len -= 3;
                      }
                      if (len) {
                        output[_out++] = from_source[from++];
                        if (len > 1) {
                          output[_out++] = from_source[from++];
                        }
                      }
                    } else {
                      from = _out - dist;
                      do {
                        output[_out++] = output[from++];
                        output[_out++] = output[from++];
                        output[_out++] = output[from++];
                        len -= 3;
                      } while (len > 2);
                      if (len) {
                        output[_out++] = output[from++];
                        if (len > 1) {
                          output[_out++] = output[from++];
                        }
                      }
                    }
                  } else if ((op & 64) === 0) {
                    here = dcode[(here & 65535) + (hold & (1 << op) - 1)];
                    continue dodist;
                  } else {
                    strm.msg = "invalid distance code";
                    state.mode = BAD$1;
                    break top;
                  }
                  break;
                }
            } else if ((op & 64) === 0) {
              here = lcode[(here & 65535) + (hold & (1 << op) - 1)];
              continue dolen;
            } else if (op & 32) {
              state.mode = TYPE$1;
              break top;
            } else {
              strm.msg = "invalid literal/length code";
              state.mode = BAD$1;
              break top;
            }
            break;
          }
      } while (_in < last && _out < end);
    len = bits >> 3;
    _in -= len;
    bits -= len << 3;
    hold &= (1 << bits) - 1;
    strm.next_in = _in;
    strm.next_out = _out;
    strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
    strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
    state.hold = hold;
    state.bits = bits;
    return;
  };
  var MAXBITS = 15;
  var ENOUGH_LENS$1 = 852;
  var ENOUGH_DISTS$1 = 592;
  var CODES$1 = 0;
  var LENS$1 = 1;
  var DISTS$1 = 2;
  var lbase = new Uint16Array([
    /* Length codes 257..285 base */
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    13,
    15,
    17,
    19,
    23,
    27,
    31,
    35,
    43,
    51,
    59,
    67,
    83,
    99,
    115,
    131,
    163,
    195,
    227,
    258,
    0,
    0
  ]);
  var lext = new Uint8Array([
    /* Length codes 257..285 extra */
    16,
    16,
    16,
    16,
    16,
    16,
    16,
    16,
    17,
    17,
    17,
    17,
    18,
    18,
    18,
    18,
    19,
    19,
    19,
    19,
    20,
    20,
    20,
    20,
    21,
    21,
    21,
    21,
    16,
    72,
    78
  ]);
  var dbase = new Uint16Array([
    /* Distance codes 0..29 base */
    1,
    2,
    3,
    4,
    5,
    7,
    9,
    13,
    17,
    25,
    33,
    49,
    65,
    97,
    129,
    193,
    257,
    385,
    513,
    769,
    1025,
    1537,
    2049,
    3073,
    4097,
    6145,
    8193,
    12289,
    16385,
    24577,
    0,
    0
  ]);
  var dext = new Uint8Array([
    /* Distance codes 0..29 extra */
    16,
    16,
    16,
    16,
    17,
    17,
    18,
    18,
    19,
    19,
    20,
    20,
    21,
    21,
    22,
    22,
    23,
    23,
    24,
    24,
    25,
    25,
    26,
    26,
    27,
    27,
    28,
    28,
    29,
    29,
    64,
    64
  ]);
  var inflate_table = (type, lens, lens_index, codes, table, table_index, work, opts) => {
    const bits = opts.bits;
    let len = 0;
    let sym = 0;
    let min = 0, max = 0;
    let root = 0;
    let curr = 0;
    let drop = 0;
    let left = 0;
    let used = 0;
    let huff = 0;
    let incr;
    let fill;
    let low;
    let mask;
    let next;
    let base = null;
    let match;
    const count = new Uint16Array(MAXBITS + 1);
    const offs = new Uint16Array(MAXBITS + 1);
    let extra = null;
    let here_bits, here_op, here_val;
    for (len = 0; len <= MAXBITS; len++) {
      count[len] = 0;
    }
    for (sym = 0; sym < codes; sym++) {
      count[lens[lens_index + sym]]++;
    }
    root = bits;
    for (max = MAXBITS; max >= 1; max--) {
      if (count[max] !== 0) {
        break;
      }
    }
    if (root > max) {
      root = max;
    }
    if (max === 0) {
      table[table_index++] = 1 << 24 | 64 << 16 | 0;
      table[table_index++] = 1 << 24 | 64 << 16 | 0;
      opts.bits = 1;
      return 0;
    }
    for (min = 1; min < max; min++) {
      if (count[min] !== 0) {
        break;
      }
    }
    if (root < min) {
      root = min;
    }
    left = 1;
    for (len = 1; len <= MAXBITS; len++) {
      left <<= 1;
      left -= count[len];
      if (left < 0) {
        return -1;
      }
    }
    if (left > 0 && (type === CODES$1 || max !== 1)) {
      return -1;
    }
    offs[1] = 0;
    for (len = 1; len < MAXBITS; len++) {
      offs[len + 1] = offs[len] + count[len];
    }
    for (sym = 0; sym < codes; sym++) {
      if (lens[lens_index + sym] !== 0) {
        work[offs[lens[lens_index + sym]]++] = sym;
      }
    }
    if (type === CODES$1) {
      base = extra = work;
      match = 20;
    } else if (type === LENS$1) {
      base = lbase;
      extra = lext;
      match = 257;
    } else {
      base = dbase;
      extra = dext;
      match = 0;
    }
    huff = 0;
    sym = 0;
    len = min;
    next = table_index;
    curr = root;
    drop = 0;
    low = -1;
    used = 1 << root;
    mask = used - 1;
    if (type === LENS$1 && used > ENOUGH_LENS$1 || type === DISTS$1 && used > ENOUGH_DISTS$1) {
      return 1;
    }
    for (; ; ) {
      here_bits = len - drop;
      if (work[sym] + 1 < match) {
        here_op = 0;
        here_val = work[sym];
      } else if (work[sym] >= match) {
        here_op = extra[work[sym] - match];
        here_val = base[work[sym] - match];
      } else {
        here_op = 32 + 64;
        here_val = 0;
      }
      incr = 1 << len - drop;
      fill = 1 << curr;
      min = fill;
      do {
        fill -= incr;
        table[next + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0;
      } while (fill !== 0);
      incr = 1 << len - 1;
      while (huff & incr) {
        incr >>= 1;
      }
      if (incr !== 0) {
        huff &= incr - 1;
        huff += incr;
      } else {
        huff = 0;
      }
      sym++;
      if (--count[len] === 0) {
        if (len === max) {
          break;
        }
        len = lens[lens_index + work[sym]];
      }
      if (len > root && (huff & mask) !== low) {
        if (drop === 0) {
          drop = root;
        }
        next += min;
        curr = len - drop;
        left = 1 << curr;
        while (curr + drop < max) {
          left -= count[curr + drop];
          if (left <= 0) {
            break;
          }
          curr++;
          left <<= 1;
        }
        used += 1 << curr;
        if (type === LENS$1 && used > ENOUGH_LENS$1 || type === DISTS$1 && used > ENOUGH_DISTS$1) {
          return 1;
        }
        low = huff & mask;
        table[low] = root << 24 | curr << 16 | next - table_index | 0;
      }
    }
    if (huff !== 0) {
      table[next + huff] = len - drop << 24 | 64 << 16 | 0;
    }
    opts.bits = root;
    return 0;
  };
  var inftrees = inflate_table;
  var CODES = 0;
  var LENS = 1;
  var DISTS = 2;
  var {
    Z_FINISH: Z_FINISH$1,
    Z_BLOCK,
    Z_TREES,
    Z_OK: Z_OK$1,
    Z_STREAM_END: Z_STREAM_END$1,
    Z_NEED_DICT: Z_NEED_DICT$1,
    Z_STREAM_ERROR: Z_STREAM_ERROR$1,
    Z_DATA_ERROR: Z_DATA_ERROR$1,
    Z_MEM_ERROR: Z_MEM_ERROR$1,
    Z_BUF_ERROR,
    Z_DEFLATED
  } = constants$2;
  var HEAD = 16180;
  var FLAGS = 16181;
  var TIME = 16182;
  var OS = 16183;
  var EXLEN = 16184;
  var EXTRA = 16185;
  var NAME = 16186;
  var COMMENT = 16187;
  var HCRC = 16188;
  var DICTID = 16189;
  var DICT = 16190;
  var TYPE = 16191;
  var TYPEDO = 16192;
  var STORED = 16193;
  var COPY_ = 16194;
  var COPY = 16195;
  var TABLE = 16196;
  var LENLENS = 16197;
  var CODELENS = 16198;
  var LEN_ = 16199;
  var LEN = 16200;
  var LENEXT = 16201;
  var DIST = 16202;
  var DISTEXT = 16203;
  var MATCH = 16204;
  var LIT = 16205;
  var CHECK = 16206;
  var LENGTH = 16207;
  var DONE = 16208;
  var BAD = 16209;
  var MEM = 16210;
  var SYNC = 16211;
  var ENOUGH_LENS = 852;
  var ENOUGH_DISTS = 592;
  var MAX_WBITS = 15;
  var DEF_WBITS = MAX_WBITS;
  var zswap32 = (q) => {
    return (q >>> 24 & 255) + (q >>> 8 & 65280) + ((q & 65280) << 8) + ((q & 255) << 24);
  };
  function InflateState() {
    this.strm = null;
    this.mode = 0;
    this.last = false;
    this.wrap = 0;
    this.havedict = false;
    this.flags = 0;
    this.dmax = 0;
    this.check = 0;
    this.total = 0;
    this.head = null;
    this.wbits = 0;
    this.wsize = 0;
    this.whave = 0;
    this.wnext = 0;
    this.window = null;
    this.hold = 0;
    this.bits = 0;
    this.length = 0;
    this.offset = 0;
    this.extra = 0;
    this.lencode = null;
    this.distcode = null;
    this.lenbits = 0;
    this.distbits = 0;
    this.ncode = 0;
    this.nlen = 0;
    this.ndist = 0;
    this.have = 0;
    this.next = null;
    this.lens = new Uint16Array(320);
    this.work = new Uint16Array(288);
    this.lendyn = null;
    this.distdyn = null;
    this.sane = 0;
    this.back = 0;
    this.was = 0;
  }
  var inflateStateCheck = (strm) => {
    if (!strm) {
      return 1;
    }
    const state = strm.state;
    if (!state || state.strm !== strm || state.mode < HEAD || state.mode > SYNC) {
      return 1;
    }
    return 0;
  };
  var inflateResetKeep = (strm) => {
    if (inflateStateCheck(strm)) {
      return Z_STREAM_ERROR$1;
    }
    const state = strm.state;
    strm.total_in = strm.total_out = state.total = 0;
    strm.msg = "";
    if (state.wrap) {
      strm.adler = state.wrap & 1;
    }
    state.mode = HEAD;
    state.last = 0;
    state.havedict = 0;
    state.flags = -1;
    state.dmax = 32768;
    state.head = null;
    state.hold = 0;
    state.bits = 0;
    state.lencode = state.lendyn = new Int32Array(ENOUGH_LENS);
    state.distcode = state.distdyn = new Int32Array(ENOUGH_DISTS);
    state.sane = 1;
    state.back = -1;
    return Z_OK$1;
  };
  var inflateReset = (strm) => {
    if (inflateStateCheck(strm)) {
      return Z_STREAM_ERROR$1;
    }
    const state = strm.state;
    state.wsize = 0;
    state.whave = 0;
    state.wnext = 0;
    return inflateResetKeep(strm);
  };
  var inflateReset2 = (strm, windowBits) => {
    let wrap;
    if (inflateStateCheck(strm)) {
      return Z_STREAM_ERROR$1;
    }
    const state = strm.state;
    if (windowBits < 0) {
      wrap = 0;
      windowBits = -windowBits;
    } else {
      wrap = (windowBits >> 4) + 5;
      if (windowBits < 48) {
        windowBits &= 15;
      }
    }
    if (windowBits && (windowBits < 8 || windowBits > 15)) {
      return Z_STREAM_ERROR$1;
    }
    if (state.window !== null && state.wbits !== windowBits) {
      state.window = null;
    }
    state.wrap = wrap;
    state.wbits = windowBits;
    return inflateReset(strm);
  };
  var inflateInit2 = (strm, windowBits) => {
    if (!strm) {
      return Z_STREAM_ERROR$1;
    }
    const state = new InflateState();
    strm.state = state;
    state.strm = strm;
    state.window = null;
    state.mode = HEAD;
    const ret = inflateReset2(strm, windowBits);
    if (ret !== Z_OK$1) {
      strm.state = null;
    }
    return ret;
  };
  var inflateInit = (strm) => {
    return inflateInit2(strm, DEF_WBITS);
  };
  var virgin = true;
  var lenfix;
  var distfix;
  var fixedtables = (state) => {
    if (virgin) {
      lenfix = new Int32Array(512);
      distfix = new Int32Array(32);
      let sym = 0;
      while (sym < 144) {
        state.lens[sym++] = 8;
      }
      while (sym < 256) {
        state.lens[sym++] = 9;
      }
      while (sym < 280) {
        state.lens[sym++] = 7;
      }
      while (sym < 288) {
        state.lens[sym++] = 8;
      }
      inftrees(LENS, state.lens, 0, 288, lenfix, 0, state.work, { bits: 9 });
      sym = 0;
      while (sym < 32) {
        state.lens[sym++] = 5;
      }
      inftrees(DISTS, state.lens, 0, 32, distfix, 0, state.work, { bits: 5 });
      virgin = false;
    }
    state.lencode = lenfix;
    state.lenbits = 9;
    state.distcode = distfix;
    state.distbits = 5;
  };
  var updatewindow = (strm, src, end, copy) => {
    let dist;
    const state = strm.state;
    if (state.window === null) {
      state.wsize = 1 << state.wbits;
      state.wnext = 0;
      state.whave = 0;
      state.window = new Uint8Array(state.wsize);
    }
    if (copy >= state.wsize) {
      state.window.set(src.subarray(end - state.wsize, end), 0);
      state.wnext = 0;
      state.whave = state.wsize;
    } else {
      dist = state.wsize - state.wnext;
      if (dist > copy) {
        dist = copy;
      }
      state.window.set(src.subarray(end - copy, end - copy + dist), state.wnext);
      copy -= dist;
      if (copy) {
        state.window.set(src.subarray(end - copy, end), 0);
        state.wnext = copy;
        state.whave = state.wsize;
      } else {
        state.wnext += dist;
        if (state.wnext === state.wsize) {
          state.wnext = 0;
        }
        if (state.whave < state.wsize) {
          state.whave += dist;
        }
      }
    }
    return 0;
  };
  var inflate$2 = (strm, flush) => {
    let state;
    let input, output;
    let next;
    let put;
    let have, left;
    let hold;
    let bits;
    let _in, _out;
    let copy;
    let from;
    let from_source;
    let here = 0;
    let here_bits, here_op, here_val;
    let last_bits, last_op, last_val;
    let len;
    let ret;
    const hbuf = new Uint8Array(4);
    let opts;
    let n;
    const order = (
      /* permutation of code lengths */
      new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15])
    );
    if (inflateStateCheck(strm) || !strm.output || !strm.input && strm.avail_in !== 0) {
      return Z_STREAM_ERROR$1;
    }
    state = strm.state;
    if (state.mode === TYPE) {
      state.mode = TYPEDO;
    }
    put = strm.next_out;
    output = strm.output;
    left = strm.avail_out;
    next = strm.next_in;
    input = strm.input;
    have = strm.avail_in;
    hold = state.hold;
    bits = state.bits;
    _in = have;
    _out = left;
    ret = Z_OK$1;
    inf_leave:
      for (; ; ) {
        switch (state.mode) {
          case HEAD:
            if (state.wrap === 0) {
              state.mode = TYPEDO;
              break;
            }
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (state.wrap & 2 && hold === 35615) {
              if (state.wbits === 0) {
                state.wbits = 15;
              }
              state.check = 0;
              hbuf[0] = hold & 255;
              hbuf[1] = hold >>> 8 & 255;
              state.check = crc32_1(state.check, hbuf, 2, 0);
              hold = 0;
              bits = 0;
              state.mode = FLAGS;
              break;
            }
            if (state.head) {
              state.head.done = false;
            }
            if (!(state.wrap & 1) || /* check if zlib header allowed */
            (((hold & 255) << 8) + (hold >> 8)) % 31) {
              strm.msg = "incorrect header check";
              state.mode = BAD;
              break;
            }
            if ((hold & 15) !== Z_DEFLATED) {
              strm.msg = "unknown compression method";
              state.mode = BAD;
              break;
            }
            hold >>>= 4;
            bits -= 4;
            len = (hold & 15) + 8;
            if (state.wbits === 0) {
              state.wbits = len;
            }
            if (len > 15 || len > state.wbits) {
              strm.msg = "invalid window size";
              state.mode = BAD;
              break;
            }
            state.dmax = 1 << state.wbits;
            state.flags = 0;
            strm.adler = state.check = 1;
            state.mode = hold & 512 ? DICTID : TYPE;
            hold = 0;
            bits = 0;
            break;
          case FLAGS:
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.flags = hold;
            if ((state.flags & 255) !== Z_DEFLATED) {
              strm.msg = "unknown compression method";
              state.mode = BAD;
              break;
            }
            if (state.flags & 57344) {
              strm.msg = "unknown header flags set";
              state.mode = BAD;
              break;
            }
            if (state.head) {
              state.head.text = hold >> 8 & 1;
            }
            if (state.flags & 512 && state.wrap & 4) {
              hbuf[0] = hold & 255;
              hbuf[1] = hold >>> 8 & 255;
              state.check = crc32_1(state.check, hbuf, 2, 0);
            }
            hold = 0;
            bits = 0;
            state.mode = TIME;
          /* falls through */
          case TIME:
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (state.head) {
              state.head.time = hold;
            }
            if (state.flags & 512 && state.wrap & 4) {
              hbuf[0] = hold & 255;
              hbuf[1] = hold >>> 8 & 255;
              hbuf[2] = hold >>> 16 & 255;
              hbuf[3] = hold >>> 24 & 255;
              state.check = crc32_1(state.check, hbuf, 4, 0);
            }
            hold = 0;
            bits = 0;
            state.mode = OS;
          /* falls through */
          case OS:
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (state.head) {
              state.head.xflags = hold & 255;
              state.head.os = hold >> 8;
            }
            if (state.flags & 512 && state.wrap & 4) {
              hbuf[0] = hold & 255;
              hbuf[1] = hold >>> 8 & 255;
              state.check = crc32_1(state.check, hbuf, 2, 0);
            }
            hold = 0;
            bits = 0;
            state.mode = EXLEN;
          /* falls through */
          case EXLEN:
            if (state.flags & 1024) {
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.length = hold;
              if (state.head) {
                state.head.extra_len = hold;
              }
              if (state.flags & 512 && state.wrap & 4) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32_1(state.check, hbuf, 2, 0);
              }
              hold = 0;
              bits = 0;
            } else if (state.head) {
              state.head.extra = null;
            }
            state.mode = EXTRA;
          /* falls through */
          case EXTRA:
            if (state.flags & 1024) {
              copy = state.length;
              if (copy > have) {
                copy = have;
              }
              if (copy) {
                if (state.head) {
                  len = state.head.extra_len - state.length;
                  if (!state.head.extra) {
                    state.head.extra = new Uint8Array(state.head.extra_len);
                  }
                  state.head.extra.set(
                    input.subarray(
                      next,
                      // extra field is limited to 65536 bytes
                      // - no need for additional size check
                      next + copy
                    ),
                    /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
                    len
                  );
                }
                if (state.flags & 512 && state.wrap & 4) {
                  state.check = crc32_1(state.check, input, copy, next);
                }
                have -= copy;
                next += copy;
                state.length -= copy;
              }
              if (state.length) {
                break inf_leave;
              }
            }
            state.length = 0;
            state.mode = NAME;
          /* falls through */
          case NAME:
            if (state.flags & 2048) {
              if (have === 0) {
                break inf_leave;
              }
              copy = 0;
              do {
                len = input[next + copy++];
                if (state.head && len && state.length < 65536) {
                  state.head.name += String.fromCharCode(len);
                }
              } while (len && copy < have);
              if (state.flags & 512 && state.wrap & 4) {
                state.check = crc32_1(state.check, input, copy, next);
              }
              have -= copy;
              next += copy;
              if (len) {
                break inf_leave;
              }
            } else if (state.head) {
              state.head.name = null;
            }
            state.length = 0;
            state.mode = COMMENT;
          /* falls through */
          case COMMENT:
            if (state.flags & 4096) {
              if (have === 0) {
                break inf_leave;
              }
              copy = 0;
              do {
                len = input[next + copy++];
                if (state.head && len && state.length < 65536) {
                  state.head.comment += String.fromCharCode(len);
                }
              } while (len && copy < have);
              if (state.flags & 512 && state.wrap & 4) {
                state.check = crc32_1(state.check, input, copy, next);
              }
              have -= copy;
              next += copy;
              if (len) {
                break inf_leave;
              }
            } else if (state.head) {
              state.head.comment = null;
            }
            state.mode = HCRC;
          /* falls through */
          case HCRC:
            if (state.flags & 512) {
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.wrap & 4 && hold !== (state.check & 65535)) {
                strm.msg = "header crc mismatch";
                state.mode = BAD;
                break;
              }
              hold = 0;
              bits = 0;
            }
            if (state.head) {
              state.head.hcrc = state.flags >> 9 & 1;
              state.head.done = true;
            }
            strm.adler = state.check = 0;
            state.mode = TYPE;
            break;
          case DICTID:
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            strm.adler = state.check = zswap32(hold);
            hold = 0;
            bits = 0;
            state.mode = DICT;
          /* falls through */
          case DICT:
            if (state.havedict === 0) {
              strm.next_out = put;
              strm.avail_out = left;
              strm.next_in = next;
              strm.avail_in = have;
              state.hold = hold;
              state.bits = bits;
              return Z_NEED_DICT$1;
            }
            strm.adler = state.check = 1;
            state.mode = TYPE;
          /* falls through */
          case TYPE:
            if (flush === Z_BLOCK || flush === Z_TREES) {
              break inf_leave;
            }
          /* falls through */
          case TYPEDO:
            if (state.last) {
              hold >>>= bits & 7;
              bits -= bits & 7;
              state.mode = CHECK;
              break;
            }
            while (bits < 3) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.last = hold & 1;
            hold >>>= 1;
            bits -= 1;
            switch (hold & 3) {
              case 0:
                state.mode = STORED;
                break;
              case 1:
                fixedtables(state);
                state.mode = LEN_;
                if (flush === Z_TREES) {
                  hold >>>= 2;
                  bits -= 2;
                  break inf_leave;
                }
                break;
              case 2:
                state.mode = TABLE;
                break;
              case 3:
                strm.msg = "invalid block type";
                state.mode = BAD;
            }
            hold >>>= 2;
            bits -= 2;
            break;
          case STORED:
            hold >>>= bits & 7;
            bits -= bits & 7;
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if ((hold & 65535) !== (hold >>> 16 ^ 65535)) {
              strm.msg = "invalid stored block lengths";
              state.mode = BAD;
              break;
            }
            state.length = hold & 65535;
            hold = 0;
            bits = 0;
            state.mode = COPY_;
            if (flush === Z_TREES) {
              break inf_leave;
            }
          /* falls through */
          case COPY_:
            state.mode = COPY;
          /* falls through */
          case COPY:
            copy = state.length;
            if (copy) {
              if (copy > have) {
                copy = have;
              }
              if (copy > left) {
                copy = left;
              }
              if (copy === 0) {
                break inf_leave;
              }
              output.set(input.subarray(next, next + copy), put);
              have -= copy;
              next += copy;
              left -= copy;
              put += copy;
              state.length -= copy;
              break;
            }
            state.mode = TYPE;
            break;
          case TABLE:
            while (bits < 14) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.nlen = (hold & 31) + 257;
            hold >>>= 5;
            bits -= 5;
            state.ndist = (hold & 31) + 1;
            hold >>>= 5;
            bits -= 5;
            state.ncode = (hold & 15) + 4;
            hold >>>= 4;
            bits -= 4;
            if (state.nlen > 286 || state.ndist > 30) {
              strm.msg = "too many length or distance symbols";
              state.mode = BAD;
              break;
            }
            state.have = 0;
            state.mode = LENLENS;
          /* falls through */
          case LENLENS:
            while (state.have < state.ncode) {
              while (bits < 3) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.lens[order[state.have++]] = hold & 7;
              hold >>>= 3;
              bits -= 3;
            }
            while (state.have < 19) {
              state.lens[order[state.have++]] = 0;
            }
            state.lencode = state.lendyn;
            state.lenbits = 7;
            opts = { bits: state.lenbits };
            ret = inftrees(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
            state.lenbits = opts.bits;
            if (ret) {
              strm.msg = "invalid code lengths set";
              state.mode = BAD;
              break;
            }
            state.have = 0;
            state.mode = CODELENS;
          /* falls through */
          case CODELENS:
            while (state.have < state.nlen + state.ndist) {
              for (; ; ) {
                here = state.lencode[hold & (1 << state.lenbits) - 1];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (here_bits <= bits) {
                  break;
                }
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (here_val < 16) {
                hold >>>= here_bits;
                bits -= here_bits;
                state.lens[state.have++] = here_val;
              } else {
                if (here_val === 16) {
                  n = here_bits + 2;
                  while (bits < n) {
                    if (have === 0) {
                      break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                  }
                  hold >>>= here_bits;
                  bits -= here_bits;
                  if (state.have === 0) {
                    strm.msg = "invalid bit length repeat";
                    state.mode = BAD;
                    break;
                  }
                  len = state.lens[state.have - 1];
                  copy = 3 + (hold & 3);
                  hold >>>= 2;
                  bits -= 2;
                } else if (here_val === 17) {
                  n = here_bits + 3;
                  while (bits < n) {
                    if (have === 0) {
                      break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                  }
                  hold >>>= here_bits;
                  bits -= here_bits;
                  len = 0;
                  copy = 3 + (hold & 7);
                  hold >>>= 3;
                  bits -= 3;
                } else {
                  n = here_bits + 7;
                  while (bits < n) {
                    if (have === 0) {
                      break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                  }
                  hold >>>= here_bits;
                  bits -= here_bits;
                  len = 0;
                  copy = 11 + (hold & 127);
                  hold >>>= 7;
                  bits -= 7;
                }
                if (state.have + copy > state.nlen + state.ndist) {
                  strm.msg = "invalid bit length repeat";
                  state.mode = BAD;
                  break;
                }
                while (copy--) {
                  state.lens[state.have++] = len;
                }
              }
            }
            if (state.mode === BAD) {
              break;
            }
            if (state.lens[256] === 0) {
              strm.msg = "invalid code -- missing end-of-block";
              state.mode = BAD;
              break;
            }
            state.lenbits = 9;
            opts = { bits: state.lenbits };
            ret = inftrees(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
            state.lenbits = opts.bits;
            if (ret) {
              strm.msg = "invalid literal/lengths set";
              state.mode = BAD;
              break;
            }
            state.distbits = 6;
            state.distcode = state.distdyn;
            opts = { bits: state.distbits };
            ret = inftrees(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
            state.distbits = opts.bits;
            if (ret) {
              strm.msg = "invalid distances set";
              state.mode = BAD;
              break;
            }
            state.mode = LEN_;
            if (flush === Z_TREES) {
              break inf_leave;
            }
          /* falls through */
          case LEN_:
            state.mode = LEN;
          /* falls through */
          case LEN:
            if (have >= 6 && left >= 258) {
              strm.next_out = put;
              strm.avail_out = left;
              strm.next_in = next;
              strm.avail_in = have;
              state.hold = hold;
              state.bits = bits;
              inffast(strm, _out);
              put = strm.next_out;
              output = strm.output;
              left = strm.avail_out;
              next = strm.next_in;
              input = strm.input;
              have = strm.avail_in;
              hold = state.hold;
              bits = state.bits;
              if (state.mode === TYPE) {
                state.back = -1;
              }
              break;
            }
            state.back = 0;
            for (; ; ) {
              here = state.lencode[hold & (1 << state.lenbits) - 1];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (here_op && (here_op & 240) === 0) {
              last_bits = here_bits;
              last_op = here_op;
              last_val = here_val;
              for (; ; ) {
                here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (last_bits + here_bits <= bits) {
                  break;
                }
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              hold >>>= last_bits;
              bits -= last_bits;
              state.back += last_bits;
            }
            hold >>>= here_bits;
            bits -= here_bits;
            state.back += here_bits;
            state.length = here_val;
            if (here_op === 0) {
              state.mode = LIT;
              break;
            }
            if (here_op & 32) {
              state.back = -1;
              state.mode = TYPE;
              break;
            }
            if (here_op & 64) {
              strm.msg = "invalid literal/length code";
              state.mode = BAD;
              break;
            }
            state.extra = here_op & 15;
            state.mode = LENEXT;
          /* falls through */
          case LENEXT:
            if (state.extra) {
              n = state.extra;
              while (bits < n) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.length += hold & (1 << state.extra) - 1;
              hold >>>= state.extra;
              bits -= state.extra;
              state.back += state.extra;
            }
            state.was = state.length;
            state.mode = DIST;
          /* falls through */
          case DIST:
            for (; ; ) {
              here = state.distcode[hold & (1 << state.distbits) - 1];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if ((here_op & 240) === 0) {
              last_bits = here_bits;
              last_op = here_op;
              last_val = here_val;
              for (; ; ) {
                here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (last_bits + here_bits <= bits) {
                  break;
                }
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              hold >>>= last_bits;
              bits -= last_bits;
              state.back += last_bits;
            }
            hold >>>= here_bits;
            bits -= here_bits;
            state.back += here_bits;
            if (here_op & 64) {
              strm.msg = "invalid distance code";
              state.mode = BAD;
              break;
            }
            state.offset = here_val;
            state.extra = here_op & 15;
            state.mode = DISTEXT;
          /* falls through */
          case DISTEXT:
            if (state.extra) {
              n = state.extra;
              while (bits < n) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.offset += hold & (1 << state.extra) - 1;
              hold >>>= state.extra;
              bits -= state.extra;
              state.back += state.extra;
            }
            if (state.offset > state.dmax) {
              strm.msg = "invalid distance too far back";
              state.mode = BAD;
              break;
            }
            state.mode = MATCH;
          /* falls through */
          case MATCH:
            if (left === 0) {
              break inf_leave;
            }
            copy = _out - left;
            if (state.offset > copy) {
              copy = state.offset - copy;
              if (copy > state.whave) {
                if (state.sane) {
                  strm.msg = "invalid distance too far back";
                  state.mode = BAD;
                  break;
                }
              }
              if (copy > state.wnext) {
                copy -= state.wnext;
                from = state.wsize - copy;
              } else {
                from = state.wnext - copy;
              }
              if (copy > state.length) {
                copy = state.length;
              }
              from_source = state.window;
            } else {
              from_source = output;
              from = put - state.offset;
              copy = state.length;
            }
            if (copy > left) {
              copy = left;
            }
            left -= copy;
            state.length -= copy;
            do {
              output[put++] = from_source[from++];
            } while (--copy);
            if (state.length === 0) {
              state.mode = LEN;
            }
            break;
          case LIT:
            if (left === 0) {
              break inf_leave;
            }
            output[put++] = state.length;
            left--;
            state.mode = LEN;
            break;
          case CHECK:
            if (state.wrap) {
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold |= input[next++] << bits;
                bits += 8;
              }
              _out -= left;
              strm.total_out += _out;
              state.total += _out;
              if (state.wrap & 4 && _out) {
                strm.adler = state.check = /*UPDATE_CHECK(state.check, put - _out, _out);*/
                state.flags ? crc32_1(state.check, output, _out, put - _out) : adler32_1(state.check, output, _out, put - _out);
              }
              _out = left;
              if (state.wrap & 4 && (state.flags ? hold : zswap32(hold)) !== state.check) {
                strm.msg = "incorrect data check";
                state.mode = BAD;
                break;
              }
              hold = 0;
              bits = 0;
            }
            state.mode = LENGTH;
          /* falls through */
          case LENGTH:
            if (state.wrap && state.flags) {
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.wrap & 4 && hold !== (state.total & 4294967295)) {
                strm.msg = "incorrect length check";
                state.mode = BAD;
                break;
              }
              hold = 0;
              bits = 0;
            }
            state.mode = DONE;
          /* falls through */
          case DONE:
            ret = Z_STREAM_END$1;
            break inf_leave;
          case BAD:
            ret = Z_DATA_ERROR$1;
            break inf_leave;
          case MEM:
            return Z_MEM_ERROR$1;
          case SYNC:
          /* falls through */
          default:
            return Z_STREAM_ERROR$1;
        }
      }
    strm.next_out = put;
    strm.avail_out = left;
    strm.next_in = next;
    strm.avail_in = have;
    state.hold = hold;
    state.bits = bits;
    if (state.wsize || _out !== strm.avail_out && state.mode < BAD && (state.mode < CHECK || flush !== Z_FINISH$1)) {
      if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) ;
    }
    _in -= strm.avail_in;
    _out -= strm.avail_out;
    strm.total_in += _in;
    strm.total_out += _out;
    state.total += _out;
    if (state.wrap & 4 && _out) {
      strm.adler = state.check = /*UPDATE_CHECK(state.check, strm.next_out - _out, _out);*/
      state.flags ? crc32_1(state.check, output, _out, strm.next_out - _out) : adler32_1(state.check, output, _out, strm.next_out - _out);
    }
    strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
    if ((_in === 0 && _out === 0 || flush === Z_FINISH$1) && ret === Z_OK$1) {
      ret = Z_BUF_ERROR;
    }
    return ret;
  };
  var inflateEnd = (strm) => {
    if (inflateStateCheck(strm)) {
      return Z_STREAM_ERROR$1;
    }
    let state = strm.state;
    if (state.window) {
      state.window = null;
    }
    strm.state = null;
    return Z_OK$1;
  };
  var inflateGetHeader = (strm, head) => {
    if (inflateStateCheck(strm)) {
      return Z_STREAM_ERROR$1;
    }
    const state = strm.state;
    if ((state.wrap & 2) === 0) {
      return Z_STREAM_ERROR$1;
    }
    state.head = head;
    head.done = false;
    return Z_OK$1;
  };
  var inflateSetDictionary = (strm, dictionary) => {
    const dictLength = dictionary.length;
    let state;
    let dictid;
    let ret;
    if (inflateStateCheck(strm)) {
      return Z_STREAM_ERROR$1;
    }
    state = strm.state;
    if (state.wrap !== 0 && state.mode !== DICT) {
      return Z_STREAM_ERROR$1;
    }
    if (state.mode === DICT) {
      dictid = 1;
      dictid = adler32_1(dictid, dictionary, dictLength, 0);
      if (dictid !== state.check) {
        return Z_DATA_ERROR$1;
      }
    }
    ret = updatewindow(strm, dictionary, dictLength, dictLength);
    if (ret) {
      state.mode = MEM;
      return Z_MEM_ERROR$1;
    }
    state.havedict = 1;
    return Z_OK$1;
  };
  var inflateReset_1 = inflateReset;
  var inflateReset2_1 = inflateReset2;
  var inflateResetKeep_1 = inflateResetKeep;
  var inflateInit_1 = inflateInit;
  var inflateInit2_1 = inflateInit2;
  var inflate_2$1 = inflate$2;
  var inflateEnd_1 = inflateEnd;
  var inflateGetHeader_1 = inflateGetHeader;
  var inflateSetDictionary_1 = inflateSetDictionary;
  var inflateInfo = "pako inflate (from Nodeca project)";
  var inflate_1$2 = {
    inflateReset: inflateReset_1,
    inflateReset2: inflateReset2_1,
    inflateResetKeep: inflateResetKeep_1,
    inflateInit: inflateInit_1,
    inflateInit2: inflateInit2_1,
    inflate: inflate_2$1,
    inflateEnd: inflateEnd_1,
    inflateGetHeader: inflateGetHeader_1,
    inflateSetDictionary: inflateSetDictionary_1,
    inflateInfo
  };
  function GZheader() {
    this.text = 0;
    this.time = 0;
    this.xflags = 0;
    this.os = 0;
    this.extra = null;
    this.extra_len = 0;
    this.name = "";
    this.comment = "";
    this.hcrc = 0;
    this.done = false;
  }
  var gzheader = GZheader;
  var toString = Object.prototype.toString;
  var {
    Z_NO_FLUSH,
    Z_FINISH,
    Z_OK,
    Z_STREAM_END,
    Z_NEED_DICT,
    Z_STREAM_ERROR,
    Z_DATA_ERROR,
    Z_MEM_ERROR
  } = constants$2;
  function Inflate$1(options) {
    this.options = common.assign({
      chunkSize: 1024 * 64,
      windowBits: 15,
      to: ""
    }, options || {});
    const opt = this.options;
    if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
      opt.windowBits = -opt.windowBits;
      if (opt.windowBits === 0) {
        opt.windowBits = -15;
      }
    }
    if (opt.windowBits >= 0 && opt.windowBits < 16 && !(options && options.windowBits)) {
      opt.windowBits += 32;
    }
    if (opt.windowBits > 15 && opt.windowBits < 48) {
      if ((opt.windowBits & 15) === 0) {
        opt.windowBits |= 15;
      }
    }
    this.err = 0;
    this.msg = "";
    this.ended = false;
    this.chunks = [];
    this.strm = new zstream();
    this.strm.avail_out = 0;
    let status = inflate_1$2.inflateInit2(
      this.strm,
      opt.windowBits
    );
    if (status !== Z_OK) {
      throw new Error(messages[status]);
    }
    this.header = new gzheader();
    inflate_1$2.inflateGetHeader(this.strm, this.header);
    if (opt.dictionary) {
      if (typeof opt.dictionary === "string") {
        opt.dictionary = strings.string2buf(opt.dictionary);
      } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
        opt.dictionary = new Uint8Array(opt.dictionary);
      }
      if (opt.raw) {
        status = inflate_1$2.inflateSetDictionary(this.strm, opt.dictionary);
        if (status !== Z_OK) {
          throw new Error(messages[status]);
        }
      }
    }
  }
  Inflate$1.prototype.push = function(data, flush_mode) {
    const strm = this.strm;
    const chunkSize = this.options.chunkSize;
    const dictionary = this.options.dictionary;
    let status, _flush_mode, last_avail_out;
    if (this.ended) return false;
    if (flush_mode === ~~flush_mode) _flush_mode = flush_mode;
    else _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH;
    if (toString.call(data) === "[object ArrayBuffer]") {
      strm.input = new Uint8Array(data);
    } else {
      strm.input = data;
    }
    strm.next_in = 0;
    strm.avail_in = strm.input.length;
    for (; ; ) {
      if (strm.avail_out === 0) {
        strm.output = new Uint8Array(chunkSize);
        strm.next_out = 0;
        strm.avail_out = chunkSize;
      }
      status = inflate_1$2.inflate(strm, _flush_mode);
      if (status === Z_NEED_DICT && dictionary) {
        status = inflate_1$2.inflateSetDictionary(strm, dictionary);
        if (status === Z_OK) {
          status = inflate_1$2.inflate(strm, _flush_mode);
        } else if (status === Z_DATA_ERROR) {
          status = Z_NEED_DICT;
        }
      }
      while (strm.avail_in > 0 && status === Z_STREAM_END && strm.state.wrap > 0 && data[strm.next_in] !== 0) {
        inflate_1$2.inflateReset(strm);
        status = inflate_1$2.inflate(strm, _flush_mode);
      }
      switch (status) {
        case Z_STREAM_ERROR:
        case Z_DATA_ERROR:
        case Z_NEED_DICT:
        case Z_MEM_ERROR:
          this.onEnd(status);
          this.ended = true;
          return false;
      }
      last_avail_out = strm.avail_out;
      if (strm.next_out) {
        if (strm.avail_out === 0 || status === Z_STREAM_END) {
          if (this.options.to === "string") {
            let next_out_utf8 = strings.utf8border(strm.output, strm.next_out);
            let tail = strm.next_out - next_out_utf8;
            let utf8str = strings.buf2string(strm.output, next_out_utf8);
            strm.next_out = tail;
            strm.avail_out = chunkSize - tail;
            if (tail) strm.output.set(strm.output.subarray(next_out_utf8, next_out_utf8 + tail), 0);
            this.onData(utf8str);
          } else {
            this.onData(strm.output.length === strm.next_out ? strm.output : strm.output.subarray(0, strm.next_out));
          }
        }
      }
      if (status === Z_OK && last_avail_out === 0) continue;
      if (status === Z_STREAM_END) {
        status = inflate_1$2.inflateEnd(this.strm);
        this.onEnd(status);
        this.ended = true;
        return true;
      }
      if (strm.avail_in === 0) break;
    }
    return true;
  };
  Inflate$1.prototype.onData = function(chunk) {
    this.chunks.push(chunk);
  };
  Inflate$1.prototype.onEnd = function(status) {
    if (status === Z_OK) {
      if (this.options.to === "string") {
        this.result = this.chunks.join("");
      } else {
        this.result = common.flattenChunks(this.chunks);
      }
    }
    this.chunks = [];
    this.err = status;
    this.msg = this.strm.msg;
  };
  function inflate$1(input, options) {
    const inflator = new Inflate$1(options);
    inflator.push(input);
    if (inflator.err) throw inflator.msg || messages[inflator.err];
    return inflator.result;
  }
  function inflateRaw$1(input, options) {
    options = options || {};
    options.raw = true;
    return inflate$1(input, options);
  }
  var Inflate_1$1 = Inflate$1;
  var inflate_2 = inflate$1;
  var inflateRaw_1$1 = inflateRaw$1;
  var ungzip$1 = inflate$1;
  var constants = constants$2;
  var inflate_1$1 = {
    Inflate: Inflate_1$1,
    inflate: inflate_2,
    inflateRaw: inflateRaw_1$1,
    ungzip: ungzip$1,
    constants
  };
  var { Deflate, deflate, deflateRaw, gzip } = deflate_1$1;
  var { Inflate, inflate, inflateRaw, ungzip } = inflate_1$1;
  var Deflate_1 = Deflate;
  var deflate_1 = deflate;
  var deflateRaw_1 = deflateRaw;
  var gzip_1 = gzip;
  var Inflate_1 = Inflate;
  var inflate_1 = inflate;
  var inflateRaw_1 = inflateRaw;
  var ungzip_1 = ungzip;
  var constants_1 = constants$2;
  var pako = {
    Deflate: Deflate_1,
    deflate: deflate_1,
    deflateRaw: deflateRaw_1,
    gzip: gzip_1,
    Inflate: Inflate_1,
    inflate: inflate_1,
    inflateRaw: inflateRaw_1,
    ungzip: ungzip_1,
    constants: constants_1
  };

  // src/assets/iconify.png
  var iconify_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABGdBTUEAALGPC/xhBQAAFjxJREFUeAHtnXmcVMW1xw8DCLKEfRlkGTYVCWEP6AOGCGFEQASTgOEjLoCIIkleYlDE9/7QIH5MPsYlIEJQ8M1TzCeACBIWUcAPQobNIKuMgCAIwrDvy3v1vXgnzUx3Vd3u2z23Z/p8PsNtuurWrTq/03Wrzjl1Tqn/UyTFjE6duyC7vzuq/o7JHvX39eHjcurceTlz/qKcPn9B/V1Un69eGXrFcmWlQrnrnGtFda2g/l+pfDlpWLOKNKpVVTKcv2rqu+uKGadESiW7AJy9cFHW7zogOTv3yaa9B2X3oWOSd+pMXICqXqmCZNSuKq0a1JGOzepLu8bpcv11ZePyrEQ1mnQCcOnyFdmw+4D8UwEO6Jv3HRK+KwoqUzpNWtav7QjDj5VAtM1IF75LJkoaAdj09UFZsH67/GPjl3L8zLlA8rhKhfJyR5vm0qfdTdKqYZ1A9rFgpwItAAeOnnRAn6+A512eTMTaoa8SBIQhvVrlwHY9kAKwZd93Mm3ZWvlk8y5J9jVqqVKlpHvLxjL89g5yS/1agROEQAnABrWYm/rRWvlsx9eBY5QfHbr1xoYyokcHaasWj0GhQAgAC7opS3Nk/Vf7g8KXuPajXZN6MrJnR2HhWNRUpAJw6PhpeXHeSlm6KddXPqSllZJ61X7g7N+v7uOrSb3qldU+n73+1f2+u+/nwaF6gat6gguyP++ko0tg7YE+Yf/RE3Llir8qk5/+qJn8rl8XqV2loq/j99JYkQjAZcXI7E8/lylLchyFjJcOh6tbUSlo2jWuJx2b3qD+6kvTutWlrM/bsYtqq5n7bZ7k5KrtZ+43SvewX04rhVOshCCO/GlHGdKltZRWgptoSrgAwLgJc1YoZh6JaazN6taQrNbNpFPzBmpxVTvhzEOItygdxJov98qiz3fKzhjH01SNZ9yAbo4gx8QYjzcnTABg2F8WrZa3PtkQ9cq+RuUKzj67X/ub5aZ6NT0ONb7Vt+8/LB+s2+boKY6cjE4TyY7hge5t5bGszgkT6IQIwMHjp+TJ7MWyUWnwoiEWS/d1ayOsootimvTSZwSdXczbKzY62kov97p12yiN4gtDshKyNoi7AHy6bY88M2upHDvtXXvXtUWGs21KFq2aC6B7RXvJtnbl1t3uV9bXqhXLy7ODekqXmxtZ3xNNxbgJADbGVxZ+JjOWe5/yWR0P79FebkwP1jQfDYO5Z8eBwzJ16VrPux1eCfdntpUxvW8V9TEuFBcBwDgzXv3qFym9vRdqWqe6PDUgU9qrfXJxpHVKz/H8nOWSezDP0/CylH3hOTUbxMPQ5LsAYHP/7cyFslqtjm0Jk6qzFeraWsqkJZc1zXaMbr1LV65I9sqrW2BM2bbUWe12/jS0t+OrYHuPTT1fBeDo6bMy+q/zne2RzcOpw3v+6YGZUqdKJdtbikU9FsZ/mL3c0/qA7e5rw/pJNbU+8It8E4ADx07KqKnzrK12ZUuXltG9O8tQtbovyTRT7RZeW7haLl6+bMUGNJuTR9wl6VX9sTD6IgD88h+cNNsafMyjbHOSdXVvhZSHSuwWxmYvEszfNoQQvPnoQDUTXG9TXVsnZgHgnT9iylzraT/zlsZqe9NDKl9fTtuxklZ48ux5Z+G8Ystuq6HzOpg68u6Y1wQxCQCr/cenz7de8A26rZWM7d8tblsaK84FuBJb5xfeXyGzVm2y6iULw1cf6hvT7iBqAaCzT72z2HqrN6pXJ3m4ZwergZX0Sm8oncHkxWus2MAW8fl7e0X9o4p6z4WSx2afj2l2/D3dU+BbwXm1Ej8UeAbvTAQGYBEtRSUAqHfR8JmIAUz8ZS+5p1NLU9VUeQEOwDN4ZyMEYAEm0ZBnAWD/im7fxldvnNLqodZNUXQcgHfw0ERgASZg45U8CQCWLqx6NoYd3vmpX75XOArXh4fw0kRgAjZg5IU8CQD2fBuTLqv91ILPCwz6uvASnpoIbMDIC1kLAJ48OHOYiH0+W70U+csBeApvTQRGYGVLVgLAtIIbl+m9j4YPJU+8TJe2gyqO9eApvDUdMgEjsLJ9FVgJQPbKjUYfPnT7qHdTGr74iR+8hcfwWkf4W4KZDRkFANftKUoxYSIMOyndvolLsZfDY3htIjADOxMZBQC/fc7S6wiTbkm36un443cZvIbnOgKzP37wqa6KU6YVAE7smA5t4MyBPT9FieUAPDfFJljyr51Gx1StAHBcy0R48pQ0Zw4TTxJRDs/hvYlMGEYUAA5qms7q4cM3RLlxpahoOADvwUBHYAiWkSiiAODObCIcOIu7D5+JB0VZDu/BwEQ6LMMKAOfzTUe00VMXV+9dE0ODVA4GJnsLWIJpOAorAARnMNFwdc49RcHggA0WkTAtJAD4pRGZQ0fdbslQhzZq6KqkyhLIAbAAEx2BaTifwzIFbyIQk0nlS7iTeBFuZpOUN8z8ddvluxPhFRm1flBR+ra/SR5VVrJ4HJbwMrag9BdMdP6EYAq2BWeLQjMAAZl0xEHNeGr8AP/Nj9dHBJ++IRjUoW5RU1D6CyamiCPhsL1GAHBPNkXj4pRuPIlfvi15qWvbptd6Xvrgpa7XflDfhA3YgnEoXSMATBE64nw+R7TjSZGm/XDP9FI33P1+fOelD17qRtM3sAEjHRXEOF8AeJcRhFFHBEEM+vl8Xf+LexnYgJGOwBisXcoXAMKvmiJwEpkjRcHmgAkjMAZrl/IFAMOPjojJE7SwLLr+ltQyMAIrHYVinS8ABF7WEQGZUpQcHDBhFYq1IwCcUyfqto6IxpWi5OCACSuwdmMTOAJAvP3QhUHBYRKHj8OIKUoODoAVmEUisAZzyBGA0Ckh3E0EYUyt/sNxJpjfgRWY6cjF3BEAMm3oiAicKUouDpgwczF3BIA0Kzoi/GqKkosDJsxczNNIsKTLscPhRGLvpii5OABmuoOlYA72aWTX0hFRt/0OvKx7XqrMHw6AGdjpCOzTdhmmf1KmpSg5OWDCjjD4aXsMMwABiVKUnBwwYbf7kJoB9h45oR1dRq1q2nK/C3H2sCUvdW3b9FrPSx+81PXaj3D1TdiBfRrRqXR0Q3X9e0R3bzRlePrYkpe6tm16reelD17qeu1HuPom7MC+jOnYl06jFO6hsX6HmxeE80Qk+zm/JJjp1o31mbHc7/YhiP01YQf2Zc4Y4tVWSHBqVHz8iI7NXzJQkPtrwg7s00iYpCMSK6coOTlgwg7s00yvAJIapSg5OWDCDuxTM0ByYmvVa6sZwKqlVKViy4E0GykptqMv5gOzWd+l2bwnijmfiu3wbNZ3qRmg2MJ/NSWubnjM/koA9Kt8cummKDk5YMIO7NUrQL/PNzWSnKwpGb02YQf2aZXKl9NygyzaKUpODpiwA/u0BjX0xh6Tw0hysqZk9NqEXcOaVSQto7be3Gs6LVwyWJmcozRhh79Amo3XSHIOP9VrPH50BPZKAPQzwP6jJ1ROu3+fJtU1mCoLDgfADOx0BPZqEXidVK8U+Uz5FRUpPPdbb7ludQ9NlSWGA2AGdpEIzMHeOReQUVvv95eTqz84Gukhqe+LjgMmzFzMHQFo1aCOtqc5ud9oy1OFweOACTMXc0cAOqrATzoiA4VtAgJdO6myxHAArExZQ1zMHQFo1zhdG27ttDpBssVwfDwxQ0s9xYYDYAVmkQg3NjCHHAEg7HhLw/HvNV/ujdRe6vuAccCEFVi7oeYdAaD/7pQQaSyLPt8ZqSiq70lu9N/vLZN1Kpp1SaZLV64IvH363aXy+pJ/+sIKE1ahWJdxn0iQwWmaCOE7VR6a7fsP+xInKO/UWXn5w1XOo+et3So/adlEnujfRdKrVna7UyKuC1XErkmL1si+I8fzx9uzVTMV4yf6w7hgBFY6Cg0omS8AbTPSpUqF8tpIYR+s26YEoIuubauycmXLqMxipfJD0n68+SsnAzlhTIdmtin2IejXqHhML81fpX5QhSN4V6mgN86ZGAxGOgJjsHYp/xXAwsAmxpwfuwEcEQpGsCBmzasqCfK9f37PuIJ1O59s19yDeTLmzQXyyBvvhwW/fZMbJJbjY2BjE+sRrF369yf1TZ92+mNZR06eMeYRcBs2XSOFNWX6GjZ5jox7Z4kcOFY8TNH78k7If836SH7x0ruycuvusKxhRhx9hzlFbNibv/+SvABgpKOCGOe/AriJgMNYiHRWpLdXbJQuNzfSPcOqLFOFN7/tpoayavvXYesv3LBDPtqUK4P/40fyQPd2Uq1i+bD1gvwlfJyuglp/uGG7NggXY7hXjbNNyNQczbjARkdgWzDQ9zUzADf3NcwCBBksGHBY91Bd2fiB3bWJJi9cuiwzVWr0OyfMcFKgfXvMe3Zs3fPjVQaPfvXWAhnwx/8VFrm6CGz04Yfqh/erO2M7CgcmoQEgw40tHLalVBz5aywGJBXoM/Ht/AVauIZITvDyA33CFXn+jkQGv5nxodV9pVWOnK4tGsnPb/2h3Nq8YaBS1JKkkQXY+zlbZW/Iqt40sLpq5/M/Y34mNTQGOVMblLO2iPR6oZxXzIIn7yuUevaaVwAVyU3bvWVj+fiLr/hvWCIxwY4DR3zJGsKzHlcHQVkAmuiy2jMjMPzVrFxRerRqIlmtm0vrjLqSRnLdBBNAf6z6sky9qv6lfoEFfkvG3rDgm/Jw/5jB33HgsBZ8OgKfw+UdLjQDUJkEQ0NeeY+PEalnq6by4n13RCz3WjBx7gqZtWqT19uc+uTU7aBW0D9uXl/aNEp3glr5Hdfoipooead/oULqrVXGMYwt4VKw2A4AAX5jZH9pbPDIsmnvibf/YUzwmT3mFyrYZ61CzRWaAahBRWLP6zKHkVEULZ5fmcOevLubwOS/ffZFoU6aviDQAboE/iC2OTD2xvSaQpCEulUrSW2VaLF2lYpSSblCo4cor/64QucvXpLzly7JuQuXhNM0h06ckoPHTjtXHCu//PawfHXwqFPPuSHGf3DDmzSsX9hfpNemwcCU3RUsw4HPs8LOABSQbPChybP5GJFIWvjubwb5qrgh3232ys8jPjPZC9qqCJ4v3X+nUrrFpvCBD6iRB780S9Av6Gj6qIHS9nvjT8F6hXYBbgVuaKdy0umIB/sN1u/6dZHf9++qjXGn61OQy9jqMe37AT7jhPcm8MEwEvi0EVEAKBzZ0yI37ZIcOXjc3+0ZjGKXwbu9OBCuVxN+2csRbL8yrcLzKYr3JjJhqBUAjAamrJSocP8we7mpH57LUTbN+vUgpbio6/neIN3QQcVZfu8/B0tvQyoXr32G527I90j3gl2o4SdcPa0AcANTsukEMfvPmQYtVLiHm75j2zL90QFOrrtQ/bXpviCU86sfqxa2U0fe7buVE17r9vyMH8zAzkRGAWDlbJOm/LWFq33TEIZ2minzsaxOkj3m59IizDYmtG5QPt+ptKlzfz9EBt/WyvcuofGD1yYCM7AzUcRdQOiNWJkG/VmtNg12Zn6xTNvxenezTfxg7TaZtmzdNTb00L4W1Wc0bd1vaSzDbm8vLRvEJ7kG211wMOkfmqqcQeBgk+PBSgBgKk6Gw1+fa9R2ZSomsM2Jp2IOgZyv1K6kRf9GWdqKkng1oY18SAHfxAelTqSxoLD/9YwF2vSw3IsgTnvk7kLm9kjtWgsADbyi1LWkbDXRIDX1odiJNyEI6N/xZEq0IKBE6t+hhbJUtvVFoWPila2m9MGftPMUY9GTAMDw4a/PkY0heecidXyUivj5cM/4JZkOfS4KkZVb9zjJkVkcYUWMB/Hrat2oruM400v96hNlon5j6VqZbJEnGXPytEcGWE39Ln88CQA3sf8crN5Dx06fc9uIeB1/T3e5p1PLiOXxKCAJAgYaPGM5HYOVLhaqqvwQ8NQhBQuvN9TKiaS/r9ksz/39E+Mj6ee76r1fR6m8vZBnAaDxT7ftccyPJusXGSsmKgWISZfgpcNe63JCFkfJXYfyHH3+vrzjcvLsBcdv/tT34W+wDxBXl61bfWU7QFfP+7xZeg1pbkjC6LU/XuovVt7CT72zWHvGj/aYmV55sE9UjjpRCQAPffnDz+StT8zrAYRg3IDMhM8E9DGZiV/+hDnLjeAzRjymonUoiVoAWJUinYsMCaddEBK5JnCfmaxX23c+48tSGsbn7+0V9a4ragHg4bg6PT59vuPSzf9NxO5gbP9uUXfW1H6yl/OjeuF9e7+Iziqb66sP9dUe6zPxJCYBoPEzyn4+Yspc67ODLKSeHdQjbsoi04CDWo6S5xnlObx8yy6rLpIdFDWzKcqbqbGYBYAHHD19Vh6cNFvrTRzaETSGLwzJKuShGlqnJH1GvTs2e5FRw+fyBO/eNx8dqLah17tfRX31RQB4Oj78o6bOsxaCsqVLy+jenWVotzZRd7443IhhB93+xct2ugvAnzziLt8MTL4JAGAwE4z+63zr1wH3dG2RIU8PzPS8f+XeZCb0KZh0TVa90DEy7b82rK8vv3y3XV8FgEZZE/x25kLrhSH3cFQZ69WQrq19dS+j7aARWks8eXDmMNnzQ/vOgu9PQ3vH/M4PbZPPvgsAjbI7GD9rqfUWkXsgfAyfUjoDvxxNr7YanH9x4Hxe7e1NblwFe8xW77lBPWNa7Rds0/1/XASAxtnSYDyaoU72mDSGbmfcK5pDTgrfqDRxxYE4QzF1aY7Re7fgWNHw3Z/Z1jHuqI9xobgJgNtb1MbPqNnAxnbg3uNeOYE0/PYOSbtbYHU/bdlaownXHW/oFd3+s+pX78c5zNB2C36OuwDwQBY8T2YvtrIiFuwg/8evjdPE+LfbODmEayNR32Ex5TwFBzVNZ/Ui9Qmr3sQhvRKyME6IADBQGPOXRauV/cD7K8FlVI3KFRxTbL/2N/sSqcRt148rBid8EzifbzqiHel5TPn4FzyW1Tlhgp4wAXAHjWfRhDkrjO5lbv1I12bKSpfVupl0UqtjtkeJnhkQaKJxYXYmJo8pLEukcbjf48Y1bkA3a08e975YrwkXADoM87JXbpQpytHBlNfGZoCYcok4gs2+Y9P6cTkbSOxdwq/iY8C5QARZF4rNpt/UwXt3pHKcGdK1TcKFmOcXiQDwYAhnjRfnrfS8Or56d+R/MUHXq6bs+kprhuaMoMicEURQSKdKiBoY72ZM4zwgguhc1TmHU+fOC2cCibfPgVB8Cgi8rIu9G7k3kUs4YPvEXV2tvHcjtxJbSZEKgNt1FktT1DZpvdonlwTiuBYndkyHNhLBi0AIgDtQDqTi6as7lezWTcYru5gRSr+hO6uX6HEFSgDcwROfgP0zgSC8KpHcNoJyZWVPcAb0GZGOaBdlXwMpAC5DOACxYP12ma/+dIGr3PpBurL2ICYPUbnCReYISl8DLQChTEKrhjCwzz5+xuyRHHpvoj4ThJFYi4BeMBpXovrg9TlJIwDuwDA0bVDnElg45qi/zWovborC5d7r95VTQQReJvYuCzoicCbbIdakE4CCIGJSXa8WjwjDJhW/Z/ehY5J3Sh8ssWAbtv8nzQqZNki2AOiEXHejbtu2EbR6SS8A4RjK4RD28LuUMOxR171HTqizAOedvf4ZJTCh+37uD9ULoCdAR8ABV3IqNlI6hMYKdHQJnBsobvT/U5ZyxECsRKYAAAAASUVORK5CYII=";

  // src/assets/material.png
  var material_default = "data:image/png;base64,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";

  // src/assets/feather.png
  var feather_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAASTSURBVHgB7Z09TBRRFIWvxkYro61GKy3VUhs1thixsQUaWzG2JkBiq2BjYgW0VBptVWywBEq1wWjrX0OLcxgnhLBvd4adnXffO+dLCLDs7pCcb96772dmj9j9nR0TtBw1QY0EIEcCkCMByJEA5EgAciQAORKAHAlAjgQgRwKQIwHIkQDkSAByJAA5EoAcCUCOBCBHApAjAciRAORIAHIkADkSgBwJQI4EIEcCkCMByJEA5EgAco6ZOMDJE2aXz5iNXzY7d7r4+azZ+dP7n7P1s/za/G72asNs9YslyRHdH2CPGxfMJq4VwV8qJWjCn+1ChE2z5bW0ZJAAVgY/c7v83gYQYGqpbCG8Qy0AzvKZMbPpWzYSFt6Zzb0tWwev0AqAPv3Do4N9e9ugFbj51G9rQDkKQIG3/nj04QMcA8dCIekRuhYA4ePMH1Tk7RZ1RXX/sejPN4pKf+vXXlOO154/VYZ6pygYx6/YQPDam8/K9/IElQB1wkdQz4u+e+F9/b4bZ3lVSPZrVfB+V5746g5oBKgTPoKfHaJoQ/izY+VQMgTChwReCkOKGqBO+Bi2Ta8MFwzCnVw2e7gSfg4kwcjDC9kLMCj83b65qNKXPllrYPgHoUJg2NnWnMOwZC1A3fBHMXMHofq1BKgXPJCtAHXD3/hhIwMtAeqKXqAF8NAKZCmAh/Ar+hWVWGyKTXYCeAq/Ol6oFZi42nzRqW2yEsBb+BWhOYVq2Tkm2QjgNfzq2KHjxu4GshDAc/gVr9d7P97FekQ/khegq/AxbPs9X37N37PGrH7t/filyItESW8J6yr8xclihu/q3u+YyPm7XVb4dQnN/588blFJtgWIFX7Fg4abSEJDQY0CDkHs8HMiOQG8hL/ccO2g3/8bk6QEcBP+Wrly2ITQeD/23oBkBPAUPpZ8mxIS4JsEGEzq4YPrF3s/HnuLmHsBcggfkz2hGb/YF5G4F2BxKu3wQWiLGPp/CTCAUN+ZSvg4+0Pv7+ESsmQnglIIH2CTaGi+f+6NRSdZAVIIH+sHoeYfW8Y8bA+nvDKoi/AR/Gyf3b8ezn5AJ0BX4S9NhP+O8L1cHEIlgIfwEXyTVcRRQyOAl/BRvHqCQgAP4WPYeveFv8vEsxfAS/ixt6SFyFoAhT+YbAVQ+PXI8jZxdXbyILx+l3EPSwrhg+xaAA/buFIJH2QlgMJvTjYCKPzDkYUACv/wJC+Awh+OpEcBGuoNT7ItgMJvh2QFUPjtkN08gMJvRlYCtBE+tm+zhA+yEaCN8LEDeZEofOD+VrE7L80FOYYP9KFRNcg1fOBaAAz1YpNz+MCtAJrh6waXAij87nAngIfwVz9zhA9crQV0Mb0r9uOmBVD4cXAhgMKPR3QBFH5cogqAW64q/LhEFUDhx8flPIDC746oAvT6JA2F3y1R5wFwnTzuADbxvyuoPrhRdAf1x8cLLQfTIwHIkQDkSAByJAA5EoAcCUCOBCBHApAjAciRAORIAHIkADkSgBwJQI4EIEcCkCMByJEA5EgAciQAORKAHAlAjgQgRwKQIwHIkQDkSAByJAA5EoCcf15mOu/oxZ+PAAAAAElFTkSuQmCC";

  // src/assets/pixbay.png
  var pixbay_default = "data:image/png;base64,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";

  // src/assets/pexel.png
  var pexel_default = "data:image/png;base64,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";

  // src/assets/unsplash.jpeg
  var unsplash_default = "data:image/jpeg;base64,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";

  // src/assets/autoflow.png
  var autoflow_default = "data:image/png;base64,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";

  // src/assets/removeBG.png
  var removeBG_default = "data:image/png;base64,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";

  // src/assets/loremInpsum.png
  var loremInpsum_default = "data:image/png;base64,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";

  // src/assets/mockup.png
  var mockup_default = "data:image/png;base64,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";

  // src/assets/artboard.png
  var artboard_default = "data:image/png;base64,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";

  // src/assets/clayMockup.png
  var clayMockup_default = "data:image/png;base64,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";

  // src/code.ts
  var defaultPlugins = [
    // 기본 플러그인 목록
    {
      id: "735098390272716381",
      pluginName: "Iconify",
      pluginDescription: "MRP Recommend Plugins",
      pluginUrl: "https://www.figma.com/community/plugin/735098390272716381/iconify",
      pluginIcon: iconify_default,
      categories: ["Icon"]
    },
    {
      id: "843461159747178978",
      pluginName: "Feather Icon",
      pluginDescription: "MRP Recommend Plugins",
      pluginUrl: "https://www.figma.com/community/plugin/843461159747178978/Figma-Tokens",
      pluginIcon: feather_default,
      categories: ["Icon"]
    },
    {
      id: "740272380439725040",
      pluginName: "Material Design Icon",
      pluginDescription: "MRP Recommend Plugins",
      pluginUrl: "https://www.figma.com/community/plugin/740272380439725040/material-design-icons",
      pluginIcon: material_default,
      categories: ["Icon"]
    },
    {
      id: "738454987945972471",
      pluginName: "Unsplash",
      pluginDescription: "MRP Recommend Plugins",
      pluginUrl: "https://www.figma.com/community/plugin/738454987945972471/unsplash",
      pluginIcon: unsplash_default,
      categories: ["Image"]
    },
    {
      id: "1204029601871812061",
      pluginName: "Pixabay",
      pluginDescription: "MRP Recommend Plugins",
      pluginUrl: "https://www.figma.com/community/plugin/1204029601871812061/pixabay",
      pluginIcon: pixbay_default,
      categories: ["Image"]
    },
    {
      id: "829802086526281657",
      pluginName: "Pexel",
      pluginDescription: "MRP Recommend Plugins",
      pluginUrl: "https://www.figma.com/community/plugin/829802086526281657/pexels",
      pluginIcon: pexel_default,
      categories: ["Image"]
    },
    {
      id: "733902567457592893",
      pluginName: "Autoflow",
      pluginDescription: "MRP Recommend Plugins",
      pluginUrl: "https://www.figma.com/community/plugin/733902567457592893/autoflow",
      pluginIcon: autoflow_default,
      categories: ["Utility"]
    },
    {
      id: "738992712906748191",
      pluginName: "Remove BG",
      pluginDescription: "MRP Recommend Plugins",
      pluginUrl: "https://www.figma.com/community/plugin/738992712906748191/remove-bg",
      pluginIcon: removeBG_default,
      categories: ["Utility"]
    },
    {
      id: "736000994034548392",
      pluginName: "Lorem ipsum",
      pluginDescription: "MRP Recommend Plugins",
      pluginUrl: "https://www.figma.com/community/plugin/736000994034548392/lorem-ipsum",
      pluginIcon: loremInpsum_default,
      categories: ["Utility"]
    },
    {
      id: "817043359134136295",
      pluginName: "Mockup Plugin",
      pluginDescription: "MRP Recommend Plugins",
      pluginUrl: "https://www.figma.com/community/plugin/817043359134136295/mockup-plugin-devices-mockups-print-mockups-ai-mockups",
      pluginIcon: mockup_default,
      categories: ["Mockup"]
    },
    {
      id: "750673765607708804",
      pluginName: "Artboard Mockup",
      pluginDescription: "MRP Recommend Plugins",
      pluginUrl: "https://www.figma.com/community/plugin/750673765607708804/artboard-mockups",
      pluginIcon: artboard_default,
      categories: ["Mockup"]
    },
    {
      id: "819335598581469537",
      pluginName: "Clay Mockup",
      pluginDescription: "MRP Recommend Plugins",
      pluginUrl: "https://www.figma.com/community/plugin/819335598581469537/clay-mockups-3d",
      pluginIcon: clayMockup_default,
      categories: ["Mockup"]
    }
  ];
  console.log("Default plugins:", defaultPlugins);
  var accessToken = "patGgL1ObwK1rvVRH.bde07c08dc54fd2fd72bca8aced68fd2882e81924e5565a4641dea170b4933af";
  var baseId = "appoQJ18zMmkhzu10";
  var dataTable = "tblex31xbt0ajXx1F";
  var url = `https://api.airtable.com/v0/${baseId}/${dataTable}`;
  var LRUCache = class {
    constructor(maxSize) {
      this.maxSize = maxSize;
      this.cache = /* @__PURE__ */ new Map();
    }
    get(key) {
      if (!this.cache.has(key)) return void 0;
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    set(key, value) {
      if (this.cache.has(key)) {
        this.cache.delete(key);
      } else if (this.cache.size >= this.maxSize) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey !== void 0) {
          this.cache.delete(oldestKey);
        }
      }
      this.cache.set(key, value);
    }
  };
  var airtablePlugins = [];
  var MAX_CACHE_SIZE = 100;
  var searchCache = new LRUCache(MAX_CACHE_SIZE);
  var myPluginList = [];
  var searchReady = false;
  function updateSearchReadyState(state) {
    searchReady = state;
    figma.ui.postMessage({ type: "search-ready", ready: state });
  }
  async function initializeSize() {
    try {
      const savedSize = await figma.clientStorage.getAsync(
        "pluginSize"
      );
      if (savedSize) {
        figma.ui.resize(savedSize.width, savedSize.height);
        console.log(`UI resized to: ${savedSize.width}x${savedSize.height}`);
      } else {
        figma.ui.resize(520, 680);
        console.log("UI resized to default: 480x680");
      }
    } catch (error) {
      console.error("Error initializing UI size:", error);
      figma.ui.resize(520, 680);
    }
  }
  function compressData(data) {
    if (!data) {
      console.log("No data to compress");
      return [];
    }
    const jsonString = JSON.stringify(data);
    if (jsonString.length === 0) {
      console.log("Empty data to compress");
      return [];
    }
    const compressed = pako.deflate(jsonString);
    const chunkSize = 950 * 1024;
    const chunks = [];
    for (let i = 0; i < compressed.length; i += chunkSize) {
      chunks.push({
        part: chunks.length,
        data: compressed.slice(i, i + chunkSize)
      });
    }
    console.log(`Data compressed into ${chunks.length} chunks`);
    return chunks;
  }
  function decompressData(chunks) {
    try {
      if (!chunks || chunks.length === 0) {
        console.log("No chunks to decompress");
        return null;
      }
      chunks.sort((a, b) => a.part - b.part);
      const totalLength = chunks.reduce(
        (acc, chunk) => acc + chunk.data.length,
        0
      );
      const fullData = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        fullData.set(chunk.data, offset);
        offset += chunk.data.length;
      }
      console.log("Full data length after concatenation:", fullData.length);
      if (fullData.length === 0) {
        console.log("Empty data to decompress");
        return null;
      }
      let decompressed;
      try {
        decompressed = pako.inflate(fullData, { to: "string" });
        console.log("Data decompressed successfully");
      } catch (inflateError) {
        console.error("Error inflating data:", inflateError);
        return null;
      }
      if (typeof decompressed !== "string") {
        console.error("Decompressed data is not a string:", decompressed);
        return null;
      }
      const trimmedData = decompressed.trim();
      if (trimmedData === "") {
        console.log("Decompressed data is empty");
        return null;
      }
      console.log("Parsed decompressed data:", trimmedData);
      return JSON.parse(trimmedData);
    } catch (error) {
      console.error("Error decompressing data:", error);
      return null;
    }
  }
  function extractPluginIdFromUrl(url2) {
    const regex = /\/plugin\/(\d+)/;
    const match = url2.match(regex);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  }
  async function fetchWithRetry(url2, options, retries = 3, backoff = 300) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url2, options);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.warn(`Fetch attempt ${i + 1} failed: ${error}`);
        if (i < retries - 1) {
          await new Promise((res) => setTimeout(res, backoff * Math.pow(2, i)));
        } else {
          throw error;
        }
      }
    }
  }
  async function syncMyPluginList() {
    console.log("Syncing My Plugin List...");
    let clientData = null;
    let fileData = null;
    try {
      const compressedClientData = await figma.clientStorage.getAsync(
        "compressedData"
      );
      console.log("Fetched compressed client data:", compressedClientData);
      if (compressedClientData && Array.isArray(compressedClientData) && compressedClientData.length > 0) {
        clientData = decompressData(compressedClientData);
        console.log("Client data loaded:", clientData);
      } else {
        console.log("No valid client data found");
      }
    } catch (error) {
      console.log("Error fetching client data:", error);
    }
    try {
      const pluginData = figma.root.getPluginData("compressedData");
      console.log("Fetched plugin data:", pluginData);
      if (pluginData && pluginData !== "undefined" && pluginData !== "") {
        try {
          const compressedFileData = JSON.parse(pluginData);
          console.log("Parsed compressed file data:", compressedFileData);
          if (Array.isArray(compressedFileData) && compressedFileData.length > 0) {
            fileData = decompressData(compressedFileData);
            console.log("File data loaded:", fileData);
          } else {
            console.log(
              "Parsed plugin data is empty or not an array:",
              compressedFileData
            );
          }
        } catch (parseError) {
          console.error("Error parsing plugin data:", parseError);
        }
      } else {
        console.log("No valid plugin data found");
      }
    } catch (error) {
      console.log("Error fetching plugin data:", error);
    }
    let updatedData;
    if (!clientData && !fileData) {
      console.log("No existing data found, initializing with empty plugin list");
      updatedData = {
        plugins: [],
        // 빈 배열로 초기화
        lastUpdated: Date.now()
      };
    } else if (!clientData) {
      updatedData = fileData || { plugins: [], lastUpdated: Date.now() };
    } else if (!fileData) {
      updatedData = clientData;
    } else {
      updatedData = clientData.lastUpdated > fileData.lastUpdated ? clientData : fileData;
    }
    console.log("Using data for My Plugin List:", updatedData);
    const compressedData = compressData(updatedData);
    if (compressedData.length > 0) {
      await figma.clientStorage.setAsync("compressedData", compressedData);
      figma.root.setPluginData("compressedData", JSON.stringify(compressedData));
      console.log("Compressed data saved successfully");
    } else {
      console.log("No data to save");
    }
    myPluginList = updatedData.plugins.filter((plugin) => !plugin.hidden);
    console.log("Final My Plugin List:", myPluginList);
    return myPluginList;
  }
  async function saveMyPluginList(plugins) {
    console.log("Saving My Plugin List:", plugins);
    const updatedData = {
      plugins,
      lastUpdated: Date.now()
    };
    const compressedData = compressData(updatedData);
    if (compressedData.length > 0) {
      await figma.clientStorage.setAsync("compressedData", compressedData);
      figma.root.setPluginData("compressedData", JSON.stringify(compressedData));
      console.log("My Plugin List saved successfully");
    } else {
      console.log("No data to save");
    }
  }
  async function fetchAllDataFromAirtable(maxRecords = 2e3) {
    console.log("Fetching all data from Airtable...");
    figma.ui.postMessage({ type: "fetch-start" });
    updateSearchReadyState(false);
    let allRecords = [];
    let offset;
    let recordsFetched = 0;
    const fields = ["plugin-name", "plugin-desc", "plugin-link", "plugin-icon"];
    const fieldsParam = fields.map((field) => `fields[]=${encodeURIComponent(field)}`).join("&");
    try {
      do {
        const maxRecordsParam = !offset ? `&maxRecords=${maxRecords}` : "";
        const requestUrl = `${url}?pageSize=100${offset ? `&offset=${offset}` : ""}&${fieldsParam}${maxRecordsParam}`;
        console.log(`Fetching URL: ${requestUrl}`);
        const data = await fetchWithRetry(requestUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        });
        console.log(`Fetched ${data.records.length} records from Airtable`);
        allRecords = allRecords.concat(data.records);
        recordsFetched += data.records.length;
        offset = data.offset;
        if (recordsFetched >= maxRecords) {
          console.log("Reached maximum record limit.");
          break;
        }
        figma.ui.postMessage({
          type: "fetch-progress",
          fetched: recordsFetched,
          total: maxRecords
        });
      } while (offset && recordsFetched < maxRecords);
      airtablePlugins = allRecords.map((record) => ({
        id: extractPluginIdFromUrl(record.fields["plugin-link"]) || record.id,
        // plugin-link에서 ID 추출 또는 fallback
        pluginName: record.fields["plugin-name"],
        pluginDescription: record.fields["plugin-desc"] || "",
        pluginUrl: record.fields["plugin-link"],
        pluginIcon: record.fields["plugin-icon"],
        categories: []
        // Airtable에 'plugin-category' 필드가 없으므로 빈 배열로 초기화
      }));
      console.log("Fetched Airtable plugins:", airtablePlugins.length);
      console.log("Airtable Plugins:", airtablePlugins);
      figma.ui.postMessage({ type: "fetch-complete" });
      updateSearchReadyState(true);
    } catch (error) {
      console.error("Error fetching Airtable data:", error);
      airtablePlugins = [];
      figma.ui.postMessage({
        type: "fetch-error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
      updateSearchReadyState(false);
    }
  }
  async function searchPlugins(query) {
    console.log("Searching for query:", query);
    const cachedResults = searchCache.get(query);
    if (cachedResults) {
      console.log("Found in cache");
      return cachedResults;
    }
    const lowercaseQuery = query.toLowerCase();
    console.log("Lowercase query:", lowercaseQuery);
    const results = airtablePlugins.filter(
      (plugin) => `${plugin.pluginName} ${plugin.pluginDescription}`.toLowerCase().includes(lowercaseQuery) && !myPluginList.some((myPlugin) => myPlugin.id === plugin.id)
      // 이미 추가된 플러그인 제외
    ).slice(0, 10);
    console.log("Search results:", results);
    searchCache.set(query, results);
    return results;
  }
  function extractPluginInfo(url2, category, description, customName) {
    console.log("Extracting plugin info from URL:", url2);
    const normalizedUrl = url2.trim().toLowerCase();
    console.log("Normalized URL:", normalizedUrl);
    const patterns = [/\/plugin\/(\d+)(?:\/([^/?]+))?/, /\/plugin\/(\d+)/];
    let match = null;
    for (const pattern of patterns) {
      match = normalizedUrl.match(pattern);
      if (match) break;
    }
    if (!match) {
      console.error("Failed to match URL pattern");
      return null;
    }
    console.log("URL match:", match);
    const [, id, nameFromUrl] = match;
    let pluginName = customName || (nameFromUrl ? decodeURIComponent(nameFromUrl.replace(/-/g, " ")) : "");
    if (!pluginName) {
      console.log(
        'Name not found in URL and no custom name provided, using "Unknown Plugin"'
      );
      pluginName = "Unknown Plugin";
    }
    console.log("Extracted plugin info:", { id, pluginName, description });
    if (!id) {
      console.error("Failed to extract plugin ID");
      return null;
    }
    const pluginInfo = {
      id,
      pluginName,
      pluginUrl: url2,
      pluginIcon: `https://www.figma.com/community/plugin/${id}/icon`
      // Airtable 플러그인용 외부 URL
    };
    if (description) {
      pluginInfo.pluginDescription = description;
    }
    return pluginInfo;
  }
  async function initializePlugin() {
    console.log("Initializing plugin...");
    figma.showUI(__html__, { width: 500, height: 600 });
    console.log("UI shown");
    updateSearchReadyState(false);
    try {
      await syncMyPluginList();
      console.log("My Plugin List synced");
    } catch (error) {
      console.error("Error syncing My Plugin List:", error);
    }
    try {
      if (airtablePlugins.length === 0) {
        await fetchAllDataFromAirtable();
        console.log("Airtable plugins fetched");
      } else {
        console.log("Airtable plugins already loaded");
        updateSearchReadyState(true);
      }
    } catch (error) {
      console.error("Error fetching Airtable plugins:", error);
    }
    try {
      await initializeSize();
      console.log("UI size initialized");
    } catch (error) {
      console.error("Error initializing UI size:", error);
    }
  }
  initializePlugin().then(() => {
    console.log("Plugin initialization complete");
  }).catch((error) => {
    console.error("Error during plugin initialization:", error);
  });
  figma.ui.onmessage = async (msg) => {
    console.log("Received message:", msg);
    if (msg.type === "resize") {
      const width = Math.max(500, Math.round(msg.width || 0));
      const height = Math.max(500, Math.round(msg.height || 0));
      console.log("Resizing to:", width, height);
      figma.ui.resize(width, height);
      await figma.clientStorage.setAsync("pluginSize", {
        width,
        height
      });
    } else if (msg.type === "add-plugin") {
      try {
        if (!msg.url || !msg.category || !msg.name) {
          throw new Error("URL, name, and category are required");
        }
        console.log("Attempting to extract plugin info from URL:", msg.url);
        const pluginInfo = extractPluginInfo(
          msg.url,
          msg.category,
          msg.description,
          msg.name
        );
        if (!pluginInfo) {
          throw new Error("Failed to extract plugin information");
        }
        console.log("Successfully extracted plugin info:", pluginInfo);
        const existingPluginIndex = myPluginList.findIndex(
          (p) => p.id === pluginInfo.id
        );
        if (existingPluginIndex !== -1) {
          console.log(
            "Updating existing plugin:",
            myPluginList[existingPluginIndex]
          );
          if (!myPluginList[existingPluginIndex].categories) {
            myPluginList[existingPluginIndex].categories = [];
          }
          if (!myPluginList[existingPluginIndex].categories.includes(msg.category)) {
            myPluginList[existingPluginIndex].categories.push(msg.category);
          }
          myPluginList[existingPluginIndex].pluginName = msg.name;
          myPluginList[existingPluginIndex].pluginDescription = msg.description || "";
        } else {
          console.log("Adding new plugin");
          const newPlugin = {
            id: pluginInfo.id,
            pluginName: msg.name,
            pluginDescription: msg.description || "",
            pluginUrl: msg.url,
            pluginIcon: pluginInfo.pluginIcon,
            categories: [msg.category]
          };
          myPluginList.push(newPlugin);
        }
        await saveMyPluginList(myPluginList);
        figma.notify("Plugin added successfully", { timeout: 2e3 });
        figma.ui.postMessage({ type: "plugin-added", plugin: pluginInfo });
      } catch (error) {
        console.error("Error adding plugin:", error);
        figma.notify(
          "Error adding plugin: " + (error instanceof Error ? error.message : "An unknown error occurred"),
          { error: true }
        );
      }
    } else if (msg.type === "get-plugins") {
      try {
        await syncMyPluginList();
        console.log("Retrieved My Plugin List:", myPluginList);
        const flattenedPlugins = myPluginList.reduce((acc, plugin) => {
          if (plugin && plugin.categories && Array.isArray(plugin.categories)) {
            plugin.categories.forEach((category) => {
              acc.push(Object.assign({}, plugin, { category }));
            });
          } else {
            console.warn("Invalid plugin data:", plugin);
          }
          return acc;
        }, []);
        console.log("Flattened plugins to send:", flattenedPlugins);
        figma.ui.postMessage({ type: "plugins-list", plugins: flattenedPlugins });
      } catch (error) {
        console.error("Error fetching plugins:", error);
        figma.notify(
          "Error fetching plugins: " + (error instanceof Error ? error.message : "Failed to fetch plugins"),
          { error: true }
        );
      }
    } else if (msg.type === "open-plugin-page") {
      if (msg.url) {
        console.log("Opening plugin URL:", msg.url);
        figma.notify("Opening plugin page...");
        figma.openExternal(msg.url);
      } else {
        console.error("No URL provided for opening plugin page");
        figma.notify("Error: No URL provided", { error: true });
      }
    } else if (msg.type === "delete-plugin") {
      try {
        if (!msg.pluginId || !msg.category) {
          throw new Error("Plugin ID and category are required for deletion");
        }
        console.log("Before deletion:", myPluginList);
        myPluginList = myPluginList.map((plugin) => {
          if (plugin.id === msg.pluginId) {
            plugin.categories = plugin.categories.filter(
              (cat) => cat !== msg.category
            );
            if (plugin.categories.length === 0) {
              return null;
            }
          }
          return plugin;
        }).filter((plugin) => plugin !== null);
        console.log("After deletion:", myPluginList);
        await saveMyPluginList(myPluginList);
        figma.notify("Plugin deleted successfully", { timeout: 2e3 });
        const flattenedPlugins = myPluginList.reduce((acc, plugin) => {
          if (plugin && plugin.categories && Array.isArray(plugin.categories)) {
            plugin.categories.forEach((category) => {
              acc.push(Object.assign({}, plugin, { category }));
            });
          } else {
            console.warn("Invalid plugin data:", plugin);
          }
          return acc;
        }, []);
        console.log("Flattened plugins after deletion:", flattenedPlugins);
        figma.ui.postMessage({ type: "plugins-list", plugins: flattenedPlugins });
      } catch (error) {
        console.error("Error deleting plugin:", error);
        figma.notify(
          "Error deleting plugin: " + (error instanceof Error ? error.message : "An unknown error occurred"),
          { error: true }
        );
      }
    } else if (msg.type === "notify") {
      figma.notify(msg.message || "", { timeout: 2e3 });
    } else if (msg.type === "search-plugins") {
      try {
        console.log("Received search request:", msg.query);
        if (!msg.query) {
          throw new Error("Search query is required");
        }
        if (!searchReady) {
          throw new Error("Search function is not ready yet");
        }
        const searchResults = await searchPlugins(msg.query);
        console.log("Search results to be sent to UI:", searchResults);
        figma.ui.postMessage({
          type: "search-results",
          results: searchResults.map((plugin) => ({
            pluginName: plugin.pluginName,
            pluginDescription: plugin.pluginDescription,
            pluginIcon: plugin.pluginIcon,
            id: plugin.id,
            pluginUrl: plugin.pluginUrl,
            categories: plugin.categories
          }))
        });
      } catch (error) {
        console.error("Error searching plugins:", error);
        figma.notify(
          "Error searching plugins: " + (error instanceof Error ? error.message : "An unknown error occurred"),
          { error: true }
        );
        figma.ui.postMessage({
          type: "search-error",
          error: error instanceof Error ? error.message : "An unknown error occurred"
        });
      }
    } else if (msg.type === "add-plugin-from-search") {
      try {
        if (!msg.plugin) {
          throw new Error("Plugin data is required");
        }
        figma.ui.postMessage({ type: "show-category-modal", plugin: msg.plugin });
      } catch (error) {
        console.error("Error adding plugin from search:", error);
        figma.notify(
          "Error adding plugin: " + (error instanceof Error ? error.message : "An unknown error occurred"),
          { error: true }
        );
      }
    } else if (msg.type === "confirm-add-plugin") {
      try {
        const plugin = msg.plugin;
        if (!plugin || !msg.category) {
          throw new Error("Plugin data and category are required");
        }
        const existingPluginIndex = myPluginList.findIndex(
          (p) => p.id === plugin.id
        );
        if (existingPluginIndex !== -1) {
          console.log(
            "Updating existing plugin:",
            myPluginList[existingPluginIndex]
          );
          if (!myPluginList[existingPluginIndex].categories) {
            myPluginList[existingPluginIndex].categories = [];
          }
          if (!myPluginList[existingPluginIndex].categories.includes(msg.category)) {
            myPluginList[existingPluginIndex].categories.push(msg.category);
          }
        } else {
          console.log("Adding new plugin");
          const newPlugin = {
            id: plugin.id,
            pluginName: plugin.pluginName,
            pluginDescription: plugin.pluginDescription || "",
            pluginUrl: plugin.pluginUrl,
            pluginIcon: plugin.pluginIcon,
            categories: [msg.category]
          };
          myPluginList.push(newPlugin);
        }
        await saveMyPluginList(myPluginList);
        figma.notify("Plugin added successfully", { timeout: 2e3 });
        figma.ui.postMessage({ type: "plugin-added", plugin });
      } catch (error) {
        console.error("Error confirming plugin addition:", error);
        figma.notify(
          "Error adding plugin: " + (error instanceof Error ? error.message : "An unknown error occurred"),
          { error: true }
        );
      }
    } else if (msg.type === "get-default-plugins") {
      console.log("Received get-default-plugins request");
      figma.ui.postMessage({ type: "default-plugins", plugins: defaultPlugins });
    }
  };
})();
/*! Bundled license information:

pako/dist/pako.esm.mjs:
  (*! pako 2.1.0 https://github.com/nodeca/pako @license (MIT AND Zlib) *)
*/
//# sourceMappingURL=code.js.map
