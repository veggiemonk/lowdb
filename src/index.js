const Vue = require( 'vue' )
const low = require( 'lowdb' )
const storage = require( 'lowdb/browser' )
const _ = require( 'lodash/fp' )

const db = low( 'db', { storage } )
window.db = db;

function downloadJSON( data, id ) {
    let container = document.getElementById(id);

    let link = document.createElement('a');
    link.href = `data:text/json;charset=utf-8,${encodeURIComponent( JSON.stringify( data ) )}`;
    link.download = 'data.json';
    link.title = 'Download JSON';
    link.innerText = id;
    container.replaceChild(link, container.firstChild);
}

function refreshJSON( {object, output} ) {
    downloadJSON(object, 'Database');
    downloadJSON(output, 'Output');
}

downloadJSON(db.object,  'Database')

// ----------------------------------------------------------
// CODE MIRROR

var editor = CodeMirror.fromTextArea( document.getElementById( 'code' ), {
    mode: 'javascript',
    theme: 'material',
    lineNumbers: true,
    lineWrapping: false,
    lineNumbers: true,
    styleActiveLine: true,
    matchBrackets: true,
    extraKeys: {
        "Ctrl-Space": "autocomplete",
        "Cmd-Space": "autocomplete",
        "Ctrl-/": "toggleComment",
        "Cmd-/": "toggleComment"
    },
    value: `<!doctype html>\n<html>\n  ${document.documentElement.innerHTML}\n</html>`

} )

function saveCode() {
    localStorage.setItem('code', editor.getValue() )
}
function deleteCode() {
    localStorage.removeItem('code')
}

function autosave( code ) {
    localStorage.setItem('code', code )
}

function getCode() {
    return localStorage.getItem('code')
}

const initialCode = [
    "// db is also available in the console",
    "db('posts').push({",
    "  id: db('posts').size() + 1,",
    "  title: 'some post'",
    "})",
    "",
    "// db('posts').find({ id: 5 })",
    "// db('posts').find({ title: 'some post' })",
    "// db('posts').last()",
    "// db('posts').orderBy('id', 'desc')",
    "",
    "// GENERATE DATA",
    "",
    "const qs = 'rows=10&firstname={firstName}&age={numberRange|20,80}';",
    "const url = `http://www.filltext.com?${qs}`",
    "// or try http://faker.hook.io?property=name.findName&locale=en",
    "// Promise will be resolved and update the vue",
    "fetch(url)",
    ".then( res => res.json() )",
    ".catch( e => console.error(e) )",
    ".then( json => db('users').push( ...json ) );",
    "",
    "// Use lodash/fp ",
    "// api.users give the URL of the 'users' service",
    "const entities = [ 'users', 'posts', 'login', 'reset', 'config'];",
    "const api = _.reduce( ",
    "  ( acc, key ) => _.assign( {",
    "    [ key ]: `https://superapi.com/${key}`",
    "  } )( acc ), {} )( entities );",
    "",
    "// db('api').push({ entities: api })",
    "",
    "// SHORTCUT: ",
    "// Ctrl-Space ==> autocomplete ",
    "// Ctrl-/ ==> toggleComment",
    "// Ctrl-z ==> undo",
    "// Ctrl-Shift-z ==> redo",
    "",
].join( '\n' )

editor.getDoc().setValue( getCode() || initialCode )


// ----------------------------------------------------------
// Vue
Vue.filter( 'stringify', function( value ) {
    if ( value === undefined ) return 'undefined'
    return JSON.stringify( value, null, 2 )
} )

Vue.filter( 'highlight', function( value ) {
    return hljs.highlight( 'json', value ).value
} )

const vm = new Vue( {
    el: '#app',
    data: {
        error: '',
        output: '',
        autosave: !!getCode(),
        intervalId: 0,
        intervalSec: 5,
        object: db.object
    },
    computed: {
        intervalSave: function() {
            if (this.autosave) {
                if ( !this.intervalId ) {
                    saveCode()
                    const iid = setInterval(saveCode, this.interval);
                    this.intervalId = iid
                    return iid
                }
            } else {
                if (this.intervalId){
                    clearInterval(this.intervalId)
                    this.intervalId = 0
                }
                return 0
            }
        },
        interval: function(){ return this.intervalSec * 1000 }
    },
    methods: {
        eval: function() {
            this.error = ''
            this.output = ''

            try {
                const code = editor.getValue()

                if (this.autosave) { autosave( code ) }

                this.output = eval( code )
                this.object = _.assign( {}, db.object )

                if ( this.output &&
                    this.output.then &&
                    _.isFunction(this.output.then) ) {
                    const that = this;
                    this.output.then( function( data ) {
                        that.object = _.assign( {}, db.object )
                        that.output = data
                        refreshJSON(that)
                    } );
                } else {
                    refreshJSON(this)
                }



            } catch ( e ) {
                this.error = e.message
                console.error( e )
            }
        },
        reset: function() {
            editor.getDoc().setValue( initialCode )
            deleteCode()
            db.object = {}
            this.output = ''
            this.object = _.assign( {}, db.object )
            refreshJSON(this)
        }
    }
} )

vm.$watch('firstName', function (val) {
  this.fullName = val + ' ' + this.lastName
})
