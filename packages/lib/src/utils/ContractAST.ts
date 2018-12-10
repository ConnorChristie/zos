import _ from 'lodash';
import { getBuildArtifacts, BuildArtifacts } from './BuildArtifacts';
import ContractFactory from '../artifacts/ContractFactory';

// TS-TODO: Reuse in Storage.ts

// TS-TODO: define Node type.
export type Node = any;

export interface NodeMapping {
  [id: number]: Node[];
}

export interface TypeInfo {
  id: string;
  kind: string;
  label: string;
  valueType?: string;
  length?: number;
  members?: StorageInfo[];
}

export interface TypeInfoMapping {
  [id: string]: TypeInfo;
}

export interface StorageInfo {
  label: string;
  astId: number;
  type: string;
  src: string;
}

interface ContractASTProps {
  nodesFilter: string[];
}

export default class ContractAST {

  private artifacts: BuildArtifacts;
  private contract: ContractFactory;
  private imports: Set<any>;
  private nodes: NodeMapping;
  private types: TypeInfoMapping;
  private nodesFilter: string[];

  constructor(contract: ContractFactory, artifacts?: BuildArtifacts, props?: ContractASTProps) {

    this.artifacts = artifacts || getBuildArtifacts();
    this.contract = contract;

    // Transitive closure of source files imported from the contract.
    this.imports = new Set();

    // Map from ast id to nodeset across all visited contracts.
    // (Note that more than one node may have the same id, due to how truffle compiles artifacts).
    this.nodes = {};

    // Types info being collected for the current contract.
    this.types = {};

    // Node types to collect, null for all
    this.nodesFilter = props.nodesFilter || [];

    this._collectImports(this.contract.ast);
    this._collectNodes(this.contract.ast);
  }

  public getContractNode(): Node {
    return this.contract.ast.nodes.find(( node: Node ) =>
      node.nodeType === 'ContractDefinition' &&
      node.name === this.contract.contractName
    );
  }

  // TS-TODO: define return type
  public getLinearizedBaseContracts(mostDerivedFirst: boolean = false) {
    const contracts = this.getContractNode().linearizedBaseContracts.map(( id ) => this.getNode(id, 'ContractDefinition'));
    return mostDerivedFirst ? contracts : _.reverse(contracts);
  }

  public getNode(id: string, type: string): Node | never {

    if (!this.nodes[id]) {
      throw Error(`No AST nodes with id ${id} found`);
    }

    const candidates = this.nodes[id].filter(( node: Node ) => node.nodeType === type);
    switch (candidates.length) {
      case 0:
        throw Error(`No AST nodes of type ${type} with id ${id} found (got ${this.nodes[id].map(( node: Node ) => node.nodeType).join(', ')})`);
      case 1:
        return candidates[0];
      default:
        throw Error(`Found more than one node of type ${type} with the same id ${id}. Please try clearing your build artifacts and recompiling your contracts.`);
    }
  }

  private _collectImports(ast: any): void {
    ast.nodes
      .filter(( node ) => node.nodeType === 'ImportDirective')
      .map(( node ) => node.absolutePath)
      .forEach(( importPath ) => {
        if (this.imports.has(importPath)) { return; }
        this.imports.add(importPath);
        this.artifacts.getArtifactsFromSourcePath(importPath).forEach(( importedArtifact ) => {
          this._collectNodes(importedArtifact.ast);
          this._collectImports(importedArtifact.ast);
        });
      });
  }

  private _collectNodes(node: Node): void {

    // Return if we have already seen this node
    if (_.some(this.nodes[node.id] || [], ( n ) => _.isEqual(n, node))) { return; }

    // Only process nodes of the filtered types (or SourceUnits)
    if (node.nodeType !== 'SourceUnit' && this.nodesFilter && !_.includes(this.nodesFilter, node.nodeType)) { return; }

    // Add node to collection with this id otherwise
    if (!this.nodes[node.id]) {
      this.nodes[node.id] = [];
    }
    this.nodes[node.id].push(node);

    // Call recursively to children
    if (node.nodes) {
      node.nodes.forEach(this._collectNodes.bind(this));
    }

  }
}
