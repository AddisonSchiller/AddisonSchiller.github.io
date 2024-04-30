import React from 'react'
import { sortedUniq, keys, uniq } from 'lodash'
import prettier from 'prettier'
import parserBabel from 'prettier/parser-babel'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import {walkDataSchema} from './utils'




interface HashValue {
  schema1?: string
  schema2?: string
  diffs?: string
}

function decode(hash: string): HashValue {
  const parsed = JSON.parse(decodeURIComponent(atob(hash)))

  const formattedSchema1 = prettier.format(parsed.schema1 || '', {
    parser: 'json',
    plugins: [parserBabel],
  })

  const formattedSchema2 = prettier.format(parsed.schema2 || '', {
    parser: 'json',
    plugins: [parserBabel],
  })

  return { schema1: formattedSchema1, schema2: formattedSchema2 }
}

function getHash(): HashValue {
  const hash = window.location.hash.substring(1)
  if (!hash) return {}

  let decoded

  try {
    decoded = decode(hash)
  } catch (e) {
    decoded = {
      schema1: '',
      schema2: '',
    }
  }

  return {
    schema1: decoded.schema1,
    schema2: decoded.schema2,
  }
}

function encode(value: any): string {
  const stringValue = JSON.stringify(value)
  const trimmedValue = stringValue.replace(/\s{2,}/g, ' ').replace(/\r\n/g, '')
  return btoa(encodeURIComponent(trimmedValue))
}

const updateHash = ({ schema1, schema2 }: HashValue) => {
  window.location.hash = encode({ schema1, schema2 })
}

export function App() {
  const [schema1, setSchema1] = React.useState<string>(getHash().schema1 || '')
  const [schema2, setSchema2] = React.useState<string>(getHash().schema2 || '')
  const [diffs, setDiffs] = React.useState<string>(getHash().diffs || '')

  const format = () => {
    const formattedSchema1 = prettier.format(schema1, {
      parser: 'json',
      plugins: [parserBabel],
    })
    const formattedSchema2 = prettier.format(schema2, {
      parser: 'json',
      plugins: [parserBabel],
    })

    updateHash({ schema1: formattedSchema1, schema2: formattedSchema2 })
    setSchema2(formattedSchema2)
    setSchema1(formattedSchema1)
  }

  const diffSchemas = ()=>{
    const schema1Map: any = {}
    const schema2Map: any = {}
    walkDataSchema({dataSchema:JSON.parse(schema1), walk: ({dataRef, subschema}:{dataRef:string, subschema: any}): boolean=>{
      schema1Map[dataRef] = subschema
      return true
    }})

    walkDataSchema({dataSchema:JSON.parse(schema2), walk: ({dataRef, subschema}:{dataRef:string, subschema: any}): boolean=>{
      schema2Map[dataRef] = subschema
      
      
      return true
    }})
    const uniqueKeys = uniq([...keys(schema1Map), ...keys(schema2Map)])
    const schemaDiffs: string[] = []
    uniqueKeys.forEach(dataRef =>{
      const s1 = schema1Map[dataRef]
      const s2 = schema2Map[dataRef]
      if(!s1){
        schemaDiffs.push(`missing dataRef ${dataRef} in first schema`)
        return
      }
      if(!s2){
        schemaDiffs.push(`missing dataRef ${dataRef} in second schema`)
        return
      }

      if(JSON.stringify(s1.type) !== JSON.stringify(s2.type)){
        
        schemaDiffs.push(`${dataRef} has conflicting types: ${s1.type} and ${s2.type}`)
        
      }
      if((s1.enum && !s2.enum) || (s2.enum && !s1.enum)){
        schemaDiffs.push(`${dataRef} has conflicting types. One is an Enum and one is not`)
        return
      }
      if(s1.enum && s2.enum){
        if(JSON.stringify(sortedUniq(s1.enum)) !== JSON.stringify(sortedUniq(s2.enum))){
          schemaDiffs.push(`${dataRef} differing enums`)
        }
      }

    })

    setDiffs(schemaDiffs.join('\n'))    
    }



  const handleBlur = () => {
    updateHash({ schema1, schema2 })
  }

  let schema1Json: any = []
  let schema1Error = false

  let schema2JSON: any
  let schema2Error = false

  try {
    schema2JSON = JSON.parse(schema2)
  } catch (e) {
    schema2Error = true
    schema2JSON = {}
  }

  try {
    schema1Json = JSON.parse(schema1)
  } catch (e) {
    schema1Error = true
    schema1Json = []
  }

  



  return (
    <div>
      <div style={{ display: 'flex' }}>
        <div>
          <label style={{ display: 'block' }} htmlFor="schema1">
            schema1
          </label>
          <CodeMirror
            id="schema1"
            onChange={(value) => setSchema1(value)}
            onBlur={handleBlur}
            value={schema1}
            width="600px"
            height="40em"
            extensions={[json()]}
            style={{
              border: '1px solid black',
              resize: 'both',
              overflow: 'auto !important',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block' }} htmlFor="schema2">
            schema2
          </label>
          <CodeMirror
            id="schema2"
            onChange={(value) => setSchema2(value)}
            width="600px"
            height="40em"
            extensions={[json()]}
            onBlur={handleBlur}
            value={schema2}
            style={{
              border: '1px solid black',
              resize: 'both',
              overflow: 'auto !important',
            }}
          />
        </div>
        <button
          style={{ alignSelf: 'flex-start', marginTop: 16, marginLeft: 16 }}
          onClick={format}
        >
          Format
        </button>

        <button
          style={{ alignSelf: 'flex-start', marginTop: 16, marginLeft: 16 }}
          onClick={diffSchemas}
        >
          Diff
        </button>
      </div>

      {schema2Error && <p style={{ color: 'red' }}>Error processing schema2</p>}
      {schema1Error && <p style={{ color: 'red' }}>Error processing schema1</p>}

      <div>
          <label style={{ display: 'block' }} htmlFor="diffs">
            Diffs
          </label>
          <CodeMirror
            id="diffs"
            readOnly={true}
            width="1200px"
            height="40em"
            extensions={[json()]}
            onBlur={handleBlur}
            value={diffs}
            style={{
              border: '1px solid black',
              resize: 'both',
              overflow: 'auto !important',
            }}
          />
        </div>
    </div>
  )
}
