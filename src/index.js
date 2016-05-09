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

function refreshJSON( obj ) {
    downloadJSON(obj.object, 'Database');
    downloadJSON(obj.output, 'Output');
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
    onKeyEvent: function( i, e ) {
        // Hook into ctrl-space
        if ( e.keyCode == 32 && ( e.ctrlKey || e.metaKey ) && !e.altKey ) {
            e.stop();
            return startComplete();
        }
    },
    value: `<!doctype html>\n<html>\n  ${document.documentElement.innerHTML}\n</html>`

} )

const initialCode = [
    "// db is also available in the console",
    "db('posts').push({",
    "  id: db('posts').size() + 1,",
    "  title: 'some post'",
    "})",
    "",
    " // db('posts').find({ id: 5 })",
    " // db('posts').find({ title: 'some post' })",
    " // db('posts').last()",
    " // db('posts').orderBy('id', 'desc')",
    "",
    "// GENERATE DATA",
    "",
    "const qs = 'rows=10&firstname={firstName}&age={numberRange|20,80}';",
    "const url = `http://www.filltext.com?${qs}`",
    "// or try http://faker.hook.io?property=name.findName&locale=en",
    "fetch(url)",
    ".then( res => res.json() )",
    ".catch( e => console.error(e) )",
    ".then( json => db('users').push( ...json ) );",
    "",
    "// Use lodash/fp ",
    "// with this, api.users give the URL of the 'users' service",
    "const entities = [ 'users', 'posts', 'login', 'reset', 'config'];",
    "const api = _.reduce( ",
    "  ( acc, key ) => _.assign( {",
    "    [ key ]: `https://superapi.com/${key}`",
    "  } )( acc ), {} )( entities );",
    "",
    "// db('api').push({ entities: api })",
    "",
    "// Autocompletion: ",
    "// try writing _.<CTRL+SPACE>",
    "",
].join( '\n' )

editor.getDoc().setValue( initialCode )


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
        object: db.object
    },
    methods: {
        eval: function() {
            this.error = ''
            this.output = ''

            try {
                this.output = eval( editor.getValue() )
                this.object = _.assign( {}, db.object )
                refreshJSON(this)
                if ( this.output.then ) {
                    this.output.then( ( data ) => {
                        // arrow function lexical scope
                        this.object = _.assign( {}, db.object )
                        this.output = data
                        refreshJSON(this)
                    } );
                }
            } catch ( e ) {
                this.error = e.message
                console.error( e )
            }
        },
        reset: function() {
            editor.getDoc().setValue( initialCode )
            db.object = {}
            this.output = ''
            this.object = _.assign( {}, db.object )
            refreshJSON(this)
        }
    }
} )
