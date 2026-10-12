# SPDX-License-Identifier: GPL-3.0-or-later
import json, struct, pathlib

class Reader:
 def __init__(self,b): self.b=bytes(b); self.i=0; self.types={}; self.refs={}
 def raw(self,n): v=self.b[self.i:self.i+n]; self.i+=n; return v
 def num(self,f): return struct.unpack('<'+f,self.raw(struct.calcsize('<'+f)))[0]
 def string(self):
  wide=self.num('B'); n=self.num('i'); assert wide in (0,1) and 0<=n<1000000,(self.i,wide,n)
  return self.raw(n*(1+wide)).decode('utf-16le' if wide else 'latin1')
 def entry(self):
  code=self.num('B'); name=self.string() if code in [1,3,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,50] else None
  if code in [1,2,3,4]:
   t=self.num('B')
   if t==47:
    tid=self.num('i'); typ=self.string(); self.types[tid]=typ
   elif t==48: typ=self.types[self.num('i')]
   elif t==46: typ=None
   else: raise Exception(('type',self.i,t))
   node={'type':typ,'fields':{},'items':[]}
   if code in [1,2]: self.refs[self.num('i')]=node
   while self.b[self.i]!=5:
    k,v=self.entry()
    if k is None: node['items'].append(v)
    else: node['fields'][k]=v
   self.i+=1; value=node
  elif code==6:
   n=self.num('q'); value=[]
   while self.b[self.i]!=7: value.append(self.entry()[1])
   self.i+=1; assert len(value)==n,(len(value),n)
  elif code==8:
   n=self.num('i'); sz=self.num('i'); value={'bytes':list(self.raw(n*sz)),'size':sz}
  elif code in [9,10]: value=self.refs[self.num('i')]
  elif code in [11,12]: value={'external':self.num('i')}
  elif code in [13,14,41,42]: value=self.raw(16).hex()
  elif code in [39,40,50,51]: value=self.string()
  elif code in [45,46,49]: value=None
  else:
   fmt={15:'b',16:'b',17:'B',18:'B',19:'h',20:'h',21:'H',22:'H',23:'i',24:'i',25:'I',26:'I',27:'q',28:'q',29:'Q',30:'Q',31:'f',32:'f',33:'d',34:'d',37:'H',38:'H',43:'B',44:'B'}.get(code)
   if not fmt: raise Exception(('entry',self.i,code))
   value=self.num(fmt)
  return name,value
 def read(self):
  values={}
  while self.i<len(self.b):
   k,v=self.entry()
   if k: values[k]=v
  return values

