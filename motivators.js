class MotivatorsGraph {
  constructor(teamName, orderByMember) {
    this.baselineName = this.teamName = teamName;
    this.orderByMember = orderByMember;
  }

  get baselineName() { return this._baselineName; }
  set baselineName(value) {
    this._baselineName = value;
    var member = value === this.teamName || value === null ? 'Team' : value;
    document.querySelectorAll('.baseline-on-member.active').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.baseline-on-member[data-member="'+member+'"]').forEach(e => e.classList.add('active'));
    document.querySelector('h1 .team-name').innerHTML = value || this.teamName;
  }
  
  get members() {
    return Object.keys(this.orderByMember);
  }
  
  get ratingsByMotivator() {
    if (this._ratingsByMotivator) return this._ratingsByMotivator;
    
    var ratingsByMotivator = {};
    for (var member of this.members) {
      var memberOrder = this.orderByMember[member];
      memberOrder.forEach(function(motivator, ix) {
        ratingsByMotivator[motivator] = ratingsByMotivator[motivator] || [];
        ratingsByMotivator[motivator].push(10 - ix);
      });
    }
    return this._ratingsByMotivator = ratingsByMotivator;
  }
  
  get order() {
    return this._order || this.teamOrder;
  }
  
  get teamOrder() {
    return this._teamOrder || (this._teamOrder = Object.keys(this.ratingsByMotivator).sort((a, b) => this.ratingsByMotivator[b].sum() - this.ratingsByMotivator[a].sum()));
  }
  
  set order(value) {
    this._order = value;
    this.draw();
  }
  
  xForMotivator(motivator) {
    var ix = this.order.indexOf(motivator) || 0;
    return this.xForMotivatorPosition(ix);
  }
  
  xForMotivatorPosition(position) {
    return position * 100 + 50;
  }
  
  static colorForMotivator(motivator) {
    return {
      honor: '#1fbce5',
      curiosity: '#f9ad31',
      goal: '#493380',
      power: '#a6ad43',
      mastery: '#64c1ac',
      acceptance: '#ede534',
      relatedness: '#1aaf6b',
      freedom: '#eb423d',
      order: '#f7c1cf',
      status: '#ef7ea8',
    }[motivator];
  }
  
  yForRating(rating) {
    return 50 + 50 * (10 - rating);
  }
  
  draw() {
    this.drawTeamIcons();
    this.drawTeamAverage();
    this.drawTeamRatings();
    this.drawMember(this.focusedMember || this.members[0]);
  }
  
  drawTeamIcons() {
    document.querySelectorAll('#team-icons .motivator-icon').forEach(e => e.remove());
    
    for (var motivator of graph.order) {
      new MotivatorIcon(graph, motivator).draw({
        title: `On average, the team put ${motivator} in position ${10 - graph.order.indexOf(motivator)}`
      });
    }
  }
  
  drawTeamRatings() {
    document.querySelectorAll('.dot').forEach(e => e.remove());
    
    var voteCounts = {};
    for (var member of this.members) {
      var votes = this.orderByMember[member];
      for (var ix = 0; ix < votes.length; ++ix) {
        var motivation = votes[ix];
        var rating = 10 - ix;
        voteCounts[motivation] = voteCounts[motivation] || {};
        voteCounts[motivation][rating] = voteCounts[motivation][rating] || 0;
        voteCounts[motivation][rating] = voteCounts[motivation][rating] + 1;
      }
    }

    for (var motivation of Object.keys(voteCounts)) {
      for (var rating of Object.keys(voteCounts[motivation])) {
        var voteCount = voteCounts[motivation][rating];
        new Dot(this, motivation, rating, 10*(Math.sqrt(2)**(voteCount-1))).draw({
          title: `${voteCount} member${voteCount === 1 ? '' : 's'} put ${motivation} in position ${rating}`
        });
      }
    }
  }
  
  drawTeamAverage() {
    document.querySelectorAll('.team-average').forEach(e => e.remove());
    
    var linePoints = [];
    var stdDevPoints = [];
    for (var motivator of this.order) {
      var x = this.xForMotivator(motivator);
      var mean = this.ratingsByMotivator[motivator].mean();
      var stdDev = this.ratingsByMotivator[motivator].standardDeviation();
      
      new Star(this, motivator, mean).draw({
        title: `The mean team member put ${motivator} in position ${mean}`
      });
      
      linePoints.push(`${x} ${this.yForRating(mean)}`);
      stdDevPoints.push([`${x} ${this.yForRating(mean + stdDev)}`, `${x} ${this.yForRating(mean - stdDev)}`]);
    }
    document.querySelector('#team-average-line').setAttribute('points', linePoints.join(', '));
    document.querySelector('#team-standard-deviation').setAttribute('points', stdDevPoints.map(a => a[0]).join(', ') + ", " + stdDevPoints.map(a => a[1]).reverse().join(', '));
  }
  
  drawMember(member) {
    // update title
    document.querySelector('body').classList[(member || this.baselineName) ? 'add' : 'remove']('with-focus');
    document.querySelector('.focused-member').innerHTML = this.baselineName ? member || 'Team' : member;
    
    // update buttons
    var dataMember = member === this.teamName || member === null ? 'Team' : member;
    document.querySelectorAll('.focus-on-member.active').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.focus-on-member[data-member="'+dataMember+'"]').forEach(e => e.classList.add('active'));
    
    // update graph
    this.focusedMember = member || 'Team';
    this.drawMemberOrderLine(this.orderByMember[member] || graph.teamOrder);
    this.drawMemberIcons(member);
  }
  
  drawMemberOrderLine(motivators) {
    var coords = this.order.map(m => [this.xForMotivator(m), this.yForRating(10 - motivators.indexOf(m))]);
    var directions = `M ${coords[0][0]} ${coords[0][1]} ` + coords.map(c => `S ${Math.max(0, c[0]-50)} ${c[1]}, ${c[0]} ${c[1]}`).join(' ');
    document.querySelector('#focus-order-line').setAttribute('d', directions);
  }
  
  drawMemberIcons(member) {
    document.querySelectorAll('#member-icons .motivator-icon, #member-icons .motivator-diff').forEach(e => e.remove());
    if (!member || member == 'Team') { return }
    
    var order = this.orderByMember[member];
    for (var motivator of order) {
      var x = this.xForMotivatorPosition(order.indexOf(motivator)),
        y = this.yForRating(-2.25);
      
      var icon = new MotivatorIcon(graph, motivator);
      var displayWidth = 50;
      
      new Polyline([`${x} ${y-displayWidth/2}`, `${icon.x} ${icon.y+icon.width/2}`], {class: 'motivator-diff'})
        .draw({inside: document.querySelector('#member-icons')});
      icon.draw({
        inside: document.querySelector('#member-icons'),
        x: x,
        y: y,
        width: displayWidth,
        title: `${member} put ${motivator} in position ${10 - order.indexOf(motivator)}`
      });
    }
  }
};

Array.prototype.sum = function() {
  return this.reduce((a, b) => a + b)
}
Array.prototype.mean = function() {
  return this.sum()/this.length;
}
Array.prototype.sampleVariance = function() {
  var m = this.mean();
  var sum = this.reduce((a, b) => a + (b-m)**2, 0);
  return sum/(this.length - 1);
}
Array.prototype.standardDeviation = function() {
  return Math.sqrt(this.sampleVariance());
}

class ElementHandle {
  get el() {
    return this._el || (this._el = this.makeEl());
  }
  
  draw(opts) {
    opts = opts || {};
    this.updateEl(this.el, opts);
    (opts.inside || document.querySelector(this.defaultInsideSelector)).appendChild(this.el);
    opts.title && this.el.append(new Title(opts.title).el);
    return this.el;
  }
  
  updateEl(el, opts) {}
}

class Title extends ElementHandle {
  constructor(title) {
    super();
    this.title = title;
  }
  
  makeEl() {
    var el = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    el.innerHTML = this.title;
    return el;
  }
}

class Polyline extends ElementHandle {
  constructor(points, opts) {
    super();
    this.points = points;
    this.opts = opts || {};
  }
  
  makeEl() {
    var el = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    el.setAttribute('class', this.opts.class);
    el.setAttribute('points', this.points.join(", "));
    return el;
  }
}

class GraphElement extends ElementHandle {
  constructor(graph, motivator, rating) {
    super()
    this.graph = graph;
    this.motivator = motivator;
    this.rating = rating;
  }
   
  makeEl() { 
    var el = document.createElementNS('http://www.w3.org/2000/svg', this.tagName);
    this.updateEl(el, {})
    return el;
  }
  
  updateEl(el, opts) {
    // noop
  }
  
  get x() {
    return this._x || this.graph.xForMotivator(this.motivator);
  }
  
  get y() {
    return this._y || this.graph.yForRating(this.rating);
  }
  
  get color() {
    return MotivatorsGraph.colorForMotivator(this.motivator);
  }
}
  
class Dot extends GraphElement {
  constructor(graph, motivator, rating, weight=10, opacity=1) {
    super(graph, motivator, rating);
    this.weight = weight;
    this.opacity = opacity;
  }
  
  get tagName() { return 'circle' }
  get defaultInsideSelector() { return '#dots' }
  
  updateEl(el, opts) {
    el.setAttribute('class', 'dot');
    el.setAttribute('cx', this.x);
    el.setAttribute('cy', this.y);
    el.setAttribute('r', this.weight);
    el.setAttribute('fill', this.color);
    el.setAttribute('fill-opacity', this.opacity);
    el.setAttribute('stroke', '#000');
    el.setAttribute('stroke-opacity', this.opacity);
  }
}

class Star extends GraphElement {
  constructor(graph, motivator, rating) {
    super(graph, motivator, rating);
    this.width = 20;
  }
  
  get tagName() { return 'use' }
  get defaultInsideSelector() { return '#team-average-stars' }
  
  updateEl(el, opts) {
    el.setAttribute('class', 'team-average');
    el.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#starburst');
    el.setAttribute('x', this.x - this.width/2);
    el.setAttribute('y', this.y - this.width/2);
    el.setAttribute('width', this.width);
    el.setAttribute('height', this.width);
    el.setAttribute('fill', this.color);
  }
}

class MotivatorIcon extends GraphElement {
  constructor(graph, motivator, width=75) {
    super(graph, motivator, -0.5);
    this.width = width;
  }
  
  get tagName() { return 'image' }
  get defaultInsideSelector() { return '#team-icons' }
  
  updateEl(el, opts) {
    var x = opts.x || this.x,
      y = opts.y || this.y,
      w = opts.width || this.width;
    
    el.setAttribute('class', 'motivator-icon');
    el.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `images/${this.motivator}.png`);
    el.setAttribute('x', x - w/2);
    el.setAttribute('y', y - w/2);
    el.setAttribute('width', w);
    el.setAttribute('height', w);
  }
}

var searchParams = new URL(document.location).searchParams;
var teamName = searchParams.get('team');

let members = searchParams.get('members');
if (members) {
  var teams = {};
  team = teams[teamName || "URL"] = {};
  members.split(' ').forEach(member => team[member] = searchParams.get(member).split(' '));
} else if (typeof(teams) == "undefined") {
  alert("You have no teams defined. Add a teams.js but I'll show you some defaults.");
  var teams = {
    'Team': {
      Alice:   "curiosity relatedness acceptance mastery order freedom power honor goal status".split(' '),
      Bob:     "honor status mastery acceptance relatedness goal order power curiosity freedom".split(' '),
      Clara:   "curiosity mastery power honor acceptance freedom status goal relatedness order".split(' '),
      DeShawn: "curiosity goal power mastery honor relatedness order freedom acceptance status".split(' '),
      Eshana:  "curiosity relatedness acceptance goal power mastery honor order status freedom".split(' '),
      Feng:    "curiosity mastery freedom power acceptance status relatedness honor order goal".split(' '),
      Galenia: "mastery curiosity relatedness power honor status freedom order acceptance goal".split(' '),
      Hadi:    "goal honor curiosity order acceptance status relatedness power freedom mastery".split(' '),
      Itsumi:  "mastery goal curiosity freedom relatedness honor power order status acceptance".split(' '),
    }
  };
  teamName = Object.keys(teams)[0];
}

var graph = new MotivatorsGraph(teamName, teams[teamName] || teams[Object.keys(teams)[0]]);

MotivatorsGraph.Controls = class {
  static opacitySlider(callback) {
    var slider = document.createElement('input');
    slider.setAttribute('type', 'range');
    slider.setAttribute('min', 0);
    slider.setAttribute('max', 1);
    slider.setAttribute('step', .1);
    slider.setAttribute('value', 1);
    slider.oninput = callback;
    return slider;
  }
  
  static addElementControls(to) {
    to = to || document.querySelector('#graph .show');
    
    to.append('Dots');
    to.append(this.opacitySlider(
      e => document.querySelectorAll('.dot').forEach(dot => dot.style.fillOpacity = dot.style.strokeOpacity = e.target.value)
    ));

    to.append('Voter');
    to.append(this.opacitySlider(
      e => document.querySelectorAll('.order-line').forEach(dot => dot.style.fillOpacity = dot.style.strokeOpacity = e.target.value)
    ));
  }
  
  static memberFocusButton(name, callback) {
    var button = document.createElement('button');
    button.classList.add('focus-on-member');
    button.setAttribute('data-member', name);
    button.append(name);
    button.onclick = callback || (e => graph.drawMember(name));
    return button;
  }
  
  static addFocusButtons(to) {
    to = to || document.querySelector('#graph .members');
    
    graph.members.forEach(v => to.append(this.memberFocusButton(v)));
    to.append(this.memberFocusButton('Team', e => graph.drawMember(null)));
  }
  
  static memberBaselineButton(name, callback) {
    var button = document.createElement('button');
    button.classList.add('baseline-on-member');
    button.setAttribute('data-member', name);
    button.append(`Baseline ${name}`);
    button.onclick = callback || (e => (graph.baselineName = name) && (graph.order = graph.orderByMember[name]));
    return button;
  }
  
  static addBaselineButtons(to) {
    to = to || document.querySelector('#graph .baselines');
    
    graph.members.forEach(v => to.append(this.memberBaselineButton(v)));
    to.append(this.memberBaselineButton('Team', e => graph.baselineName = graph.order = null));
  }
  
  static addTeamButtons(to) {
    to = to || document.querySelector('#graph .teams');
    
    var teamButton = function(name) {
      var button = document.createElement('button');
      button.classList.add('jump-to-team');
      button.setAttribute('data-team-name', name);
      button.append(`Team ${name}`);
      button.onclick = e => document.location = document.location.href.replace(/\?.*/, '') + `?team=${encodeURIComponent(name)}`
      return button;
    };
    
    Object.keys(teams).forEach(v => to.append(teamButton(v)));
  }
}

MotivatorsGraph.Controls.addElementControls();
MotivatorsGraph.Controls.addFocusButtons();
MotivatorsGraph.Controls.addBaselineButtons();
MotivatorsGraph.Controls.addTeamButtons();
graph.baselineName = graph.baselineName;

graph.draw();